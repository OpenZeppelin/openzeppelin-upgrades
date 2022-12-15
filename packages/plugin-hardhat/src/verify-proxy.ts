import {
  toCheckStatusRequest,
  toVerifyRequest,
} from '@nomiclabs/hardhat-etherscan/dist/src/etherscan/EtherscanVerifyContractRequest';
import {
  getVerificationStatus,
  verifyContract,
} from '@nomiclabs/hardhat-etherscan/dist/src/etherscan/EtherscanService';

import {
  getTransactionByHash,
  getImplementationAddress,
  getBeaconAddress,
  getImplementationAddressFromBeacon,
  UpgradesError,
  getAdminAddress,
  isTransparentOrUUPSProxy,
  isBeacon,
  isBeaconProxy,
  isEmptySlot,
} from '@openzeppelin/upgrades-core';
import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info.json';

import { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

import { keccak256 } from 'ethereumjs-util';

import debug from './utils/debug';
import { callEtherscanApi, EtherscanAPIConfig, getEtherscanAPIConfig, RESPONSE_OK } from './utils/etherscan-api';

/**
 * Hardhat artifact for a precompiled contract
 */
interface ContractArtifact {
  contractName: string;
  sourceName: string;
  abi: any;
  bytecode: any;
}

/**
 * A contract artifact and the corresponding event that it logs during construction.
 */
interface VerifiableContractInfo {
  artifact: ContractArtifact;
  event: string;
}

/**
 * The proxy-related contracts and their corresponding events that may have been deployed the current version of this plugin.
 */
const verifiableContracts = {
  erc1967proxy: { artifact: ERC1967Proxy, event: 'Upgraded(address)' },
  beaconProxy: { artifact: BeaconProxy, event: 'BeaconUpgraded(address)' },
  upgradeableBeacon: { artifact: UpgradeableBeacon, event: 'OwnershipTransferred(address,address)' },
  transparentUpgradeableProxy: { artifact: TransparentUpgradeableProxy, event: 'AdminChanged(address,address)' },
  proxyAdmin: { artifact: ProxyAdmin, event: 'OwnershipTransferred(address,address)' },
};

/**
 * Overrides hardhat-etherscan's verify:verify subtask to fully verify a proxy or beacon.
 *
 * Verifies the contract at an address. If the address is an ERC-1967 compatible proxy, verifies the proxy and associated proxy contracts,
 * as well as the implementation. Otherwise, calls hardhat-etherscan's verify function directly.
 *
 * @param args Args to the hardhat-etherscan verify function
 * @param hre
 * @param runSuper The parent function which is expected to be hardhat-etherscan's verify function
 * @returns
 */
export async function verify(args: any, hre: HardhatRuntimeEnvironment, runSuper: RunSuperFunction<any>) {
  if (!runSuper.isDefined) {
    throw new UpgradesError(
      'The hardhat-etherscan plugin must be imported before the hardhat-upgrades plugin.',
      () =>
        'Import the plugins in the following order in hardhat.config.js:\n' +
        '  require("@nomiclabs/hardhat-etherscan");\n' +
        '  require("@openzeppelin/hardhat-upgrades");\n' +
        'Or if you are using TypeScript, import the plugins in the following order in hardhat.config.ts:\n' +
        '  import "@nomiclabs/hardhat-etherscan";\n' +
        '  import "@openzeppelin/hardhat-upgrades";\n',
    );
  }

  const provider = hre.network.provider;
  const proxyAddress = args.address;
  const errors: string[] = [];

  let beacon = false;

  if (await isTransparentOrUUPSProxy(provider, proxyAddress)) {
    await fullVerifyTransparentOrUUPS(hre, proxyAddress, hardhatVerify, errors);
  } else if (await isBeaconProxy(provider, proxyAddress)) {
    await fullVerifyBeaconProxy(hre, proxyAddress, hardhatVerify, errors);
  } else if (await isBeacon(provider, proxyAddress)) {
    beacon = true;
    const etherscanApi = await getEtherscanAPIConfig(hre);
    await fullVerifyBeacon(hre, proxyAddress, hardhatVerify, etherscanApi, errors);
  } else {
    // Doesn't look like a proxy, so just verify directly
    return hardhatVerify(proxyAddress);
  }

  if (errors.length > 0) {
    throw new UpgradesError(getVerificationErrorSummary(errors));
  }

  console.info(`\n${beacon ? 'Beacon' : 'Proxy'} fully verified.`);

  async function hardhatVerify(address: string) {
    return await runSuper({ ...args, address });
  }
}

/**
 * @param errors Accumulated verification errors
 * @returns Formatted summary of all of the verification errors that have been recorded.
 */
function getVerificationErrorSummary(errors: string[]) {
  let str = 'Verification completed with the following errors.';
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    str += `\n\nError ${i + 1}: ${error}`;
  }
  return str;
}

/**
 * Log an error about the given contract's verification attempt, and save it so it can be summarized at the end.
 *
 * @param address The address that failed to verify
 * @param contractType The type or name of the contract
 * @param details The error details
 * @param errors Accumulated verification errors
 */
function recordVerificationError(address: string, contractType: string, details: string, errors: string[]) {
  const message = `Failed to verify ${contractType} contract at ${address}: ${details}`;
  recordError(message, errors);
}

function recordError(message: string, errors: string[]) {
  console.error(message);
  errors.push(message);
}

/**
 * Indicates that the expected event topic was not found in the contract's logs according to the Etherscan API.
 */
class EventNotFound extends UpgradesError {}

/**
 * Fully verifies all contracts related to the given transparent or UUPS proxy address: implementation, admin (if any), and proxy.
 * Also links the proxy to the implementation ABI on Etherscan.
 *
 * This function will determine whether the address is a transparent or UUPS proxy based on whether its creation bytecode matches with
 * TransparentUpgradeableProxy or ERC1967Proxy.
 *
 * Note: this function does not use the admin slot to determine whether the proxy is transparent or UUPS, but will always verify
 * the admin address as long as the admin storage slot has an address.
 *
 * @param hre
 * @param proxyAddress The transparent or UUPS proxy address
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 * @errors Accumulated verification errors
 */
async function fullVerifyTransparentOrUUPS(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: any,
  hardhatVerify: (address: string) => Promise<any>,
  errors: string[],
) {
  const provider = hre.network.provider;
  const implAddress = await getImplementationAddress(provider, proxyAddress);
  await verifyImplementation(hardhatVerify, implAddress, errors);

  const etherscanApi = await getEtherscanAPIConfig(hre);

  await verifyTransparentOrUUPS();
  await linkProxyWithImplementationAbi(etherscanApi, proxyAddress, implAddress, errors);
  // Either UUPS or Transparent proxy could have admin slot set, although typically this should only be for Transparent
  await verifyAdmin();

  async function verifyAdmin() {
    const adminAddress = await getAdminAddress(provider, proxyAddress);
    if (!isEmptySlot(adminAddress)) {
      console.log(`Verifying proxy admin: ${adminAddress}`);
      try {
        await verifyContractWithCreationEvent(
          hre,
          etherscanApi,
          adminAddress,
          [verifiableContracts.proxyAdmin],
          errors,
        );
      } catch (e: any) {
        if (e instanceof EventNotFound) {
          console.log(
            'Verification skipped for proxy admin - the admin address does not appear to contain a ProxyAdmin contract.',
          );
        }
      }
    }
  }

  async function verifyTransparentOrUUPS() {
    console.log(`Verifying proxy: ${proxyAddress}`);
    await verifyContractWithCreationEvent(
      hre,
      etherscanApi,
      proxyAddress,
      [verifiableContracts.transparentUpgradeableProxy, verifiableContracts.erc1967proxy],
      errors,
    );
  }
}

/**
 * Fully verifies all contracts related to the given beacon proxy address: implementation, beacon, and beacon proxy.
 * Also links the proxy to the implementation ABI on Etherscan.
 *
 * @param hre
 * @param proxyAddress The beacon proxy address
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 * @errors Accumulated verification errors
 */
async function fullVerifyBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: any,
  hardhatVerify: (address: string) => Promise<any>,
  errors: string[],
) {
  const provider = hre.network.provider;
  const beaconAddress = await getBeaconAddress(provider, proxyAddress);
  const implAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
  const etherscanApi = await getEtherscanAPIConfig(hre);

  await fullVerifyBeacon(hre, beaconAddress, hardhatVerify, etherscanApi, errors);
  await verifyBeaconProxy();
  await linkProxyWithImplementationAbi(etherscanApi, proxyAddress, implAddress, errors);

  async function verifyBeaconProxy() {
    console.log(`Verifying beacon proxy: ${proxyAddress}`);
    await verifyContractWithCreationEvent(hre, etherscanApi, proxyAddress, [verifiableContracts.beaconProxy], errors);
  }
}

/**
 * Verifies all contracts resulting from a beacon deployment: implementation, beacon
 *
 * @param hre
 * @param beaconAddress The beacon address
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 * @param etherscanApi Configuration for the Etherscan API
 * @errors Accumulated verification errors
 */
async function fullVerifyBeacon(
  hre: HardhatRuntimeEnvironment,
  beaconAddress: any,
  hardhatVerify: (address: string) => Promise<any>,
  etherscanApi: EtherscanAPIConfig,
  errors: string[],
) {
  const provider = hre.network.provider;

  const implAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
  await verifyImplementation(hardhatVerify, implAddress, errors);
  await verifyBeacon();

  async function verifyBeacon() {
    console.log(`Verifying beacon: ${beaconAddress}`);
    await verifyContractWithCreationEvent(
      hre,
      etherscanApi,
      beaconAddress,
      [verifiableContracts.upgradeableBeacon],
      errors,
    );
  }
}

/**
 * Runs hardhat-etherscan plugin's verify command on the given implementation address.
 *
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 * @param implAddress The implementation address
 * @param errors Accumulated verification errors
 */
async function verifyImplementation(
  hardhatVerify: (address: string) => Promise<any>,
  implAddress: string,
  errors: string[],
) {
  try {
    console.log(`Verifying implementation: ${implAddress}`);
    await hardhatVerify(implAddress);
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log(`Implementation ${implAddress} already verified.`);
    } else {
      recordVerificationError(implAddress, 'implementation', e.message, errors);
    }
  }
}

/**
 * Looks for any of the possible events (in array order) at the specified address using Etherscan API,
 * and returns the corresponding VerifiableContractInfo and txHash for the first event found.
 *
 * @param etherscanApi The Etherscan API config
 * @param address The contract address for which to look for events
 * @param possibleContractInfo An array of possible contract artifacts to use for verification along
 *  with the corresponding creation event expected in the logs.
 * @returns the VerifiableContractInfo and txHash for the first event found
 * @throws {EventNotFound} if none of the events were found in the contract's logs according to Etherscan.
 */
async function searchEvent(
  etherscanApi: EtherscanAPIConfig,
  address: string,
  possibleContractInfo: VerifiableContractInfo[],
) {
  for (let i = 0; i < possibleContractInfo.length; i++) {
    const contractInfo = possibleContractInfo[i];
    const txHash = await getContractCreationTxHash(address, contractInfo.event, etherscanApi);
    if (txHash !== undefined) {
      return { contractInfo, txHash };
    }
  }

  const events = possibleContractInfo.map(contractInfo => {
    return contractInfo.event;
  });
  throw new EventNotFound(
    `Could not find an event with any of the following topics in the logs for address ${address}: ${events.join(', ')}`,
    () =>
      'If the proxy was recently deployed, the transaction may not be available on Etherscan yet. Try running the verify task again after waiting a few blocks.',
  );
}

/**
 * Verifies a contract by looking up an event that should have been logged during contract construction,
 * finds the txHash for that, and infers the constructor args to use for verification.
 *
 * Iterates through each element of possibleContractInfo to look for that element's event, until an event is found.
 *
 * @param hre
 * @param etherscanApi The Etherscan API config
 * @param address The contract address to verify
 * @param possibleContractInfo An array of possible contract artifacts to use for verification along
 *  with the corresponding creation event expected in the logs.
 * @param errors Accumulated verification errors
 * @throws {EventNotFound} if none of the events were found in the contract's logs according to Etherscan.
 */
async function verifyContractWithCreationEvent(
  hre: HardhatRuntimeEnvironment,
  etherscanApi: EtherscanAPIConfig,
  address: string,
  possibleContractInfo: VerifiableContractInfo[],
  errors: string[],
) {
  const { contractInfo, txHash } = await searchEvent(etherscanApi, address, possibleContractInfo);
  debug(`verifying contract ${contractInfo.artifact.contractName} at ${address}`);

  const tx = await getTransactionByHash(hre.network.provider, txHash);
  if (tx === null) {
    // This should not happen since the txHash came from the logged event itself
    throw new UpgradesError(`The transaction hash ${txHash} from the contract's logs was not found on the network`);
  }

  const constructorArguments = inferConstructorArgs(tx.input, contractInfo.artifact.bytecode);
  if (constructorArguments === undefined) {
    // The creation bytecode for the address does not match with the expected artifact.
    // This may be because a different version of the contract was deployed compared to what is in the plugins.
    recordVerificationError(
      address,
      contractInfo.artifact.contractName,
      `Bytecode does not match with the current version of ${contractInfo.artifact.contractName} in the Hardhat Upgrades plugin.`,
      errors,
    );
  } else {
    await verifyContractWithConstructorArgs(etherscanApi, address, contractInfo.artifact, constructorArguments, errors);
  }
}

/**
 * Verifies a contract using the given constructor args.
 *
 * @param etherscanApi The Etherscan API config
 * @param address The address of the contract to verify
 * @param artifact The contract artifact to use for verification.
 * @param constructorArguments The constructor arguments to use for verification.
 */
async function verifyContractWithConstructorArgs(
  etherscanApi: EtherscanAPIConfig,
  address: any,
  artifact: ContractArtifact,
  constructorArguments: string,
  errors: string[],
) {
  debug(`verifying contract ${address} with constructor args ${constructorArguments}`);

  const params = {
    apiKey: etherscanApi.key,
    contractAddress: address,
    sourceCode: JSON.stringify(artifactsBuildInfo.input),
    sourceName: artifact.sourceName,
    contractName: artifact.contractName,
    compilerVersion: `v${artifactsBuildInfo.solcLongVersion}`,
    constructorArguments: constructorArguments,
  };

  const request = toVerifyRequest(params);
  try {
    const response = await verifyContract(etherscanApi.endpoints.urls.apiURL, request);
    const statusRequest = toCheckStatusRequest({
      apiKey: etherscanApi.key,
      guid: response.message,
    });
    const status = await getVerificationStatus(etherscanApi.endpoints.urls.apiURL, statusRequest);

    if (status.isVerificationSuccess()) {
      console.log(`Successfully verified contract ${artifact.contractName} at ${address}.`);
    } else {
      recordVerificationError(address, artifact.contractName, status.message, errors);
    }
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log(`Contract at ${address} already verified.`);
    } else {
      recordVerificationError(address, artifact.contractName, e.message, errors);
    }
  }
}

/**
 * Gets the txhash that created the contract at the given address, by calling the
 * Etherscan API to look for an event that should have been emitted during construction.
 *
 * @param address The address to get the creation txhash for.
 * @param topic The event topic string that should have been logged.
 * @param etherscanApi The Etherscan API config
 * @returns The txhash corresponding to the logged event, or undefined if not found or if
 *   the address is not a contract.
 * @throws {UpgradesError} if the Etherscan API returned with not OK status
 */
async function getContractCreationTxHash(
  address: string,
  topic: string,
  etherscanApi: EtherscanAPIConfig,
): Promise<any> {
  const params = {
    module: 'logs',
    action: 'getLogs',
    fromBlock: '0',
    toBlock: 'latest',
    address: address,
    topic0: '0x' + keccak256(Buffer.from(topic)).toString('hex'),
  };

  const responseBody = await callEtherscanApi(etherscanApi, params);

  if (responseBody.status === RESPONSE_OK) {
    const result = responseBody.result;
    return result[0].transactionHash; // get the txhash from the first instance of this event
  } else if (responseBody.message === 'No records found') {
    debug(`no result found for event topic ${topic} at address ${address}`);
    return undefined;
  } else {
    throw new UpgradesError(
      `Failed to get logs for contract at address ${address}.`,
      () => `Etherscan returned with message: ${responseBody.message}, reason: ${responseBody.result}`,
    );
  }
}

/**
 * Calls the Etherscan API to link a proxy with its implementation ABI.
 *
 * @param etherscanApi The Etherscan API config
 * @param proxyAddress The proxy address
 * @param implAddress The implementation address
 */
async function linkProxyWithImplementationAbi(
  etherscanApi: EtherscanAPIConfig,
  proxyAddress: string,
  implAddress: string,
  errors: string[],
) {
  console.log(`Linking proxy ${proxyAddress} with implementation`);
  const params = {
    module: 'contract',
    action: 'verifyproxycontract',
    address: proxyAddress,
    expectedimplementation: implAddress,
  };
  let responseBody = await callEtherscanApi(etherscanApi, params);

  if (responseBody.status === RESPONSE_OK) {
    // initial call was OK, but need to send a status request using the returned guid to get the actual verification status
    const guid = responseBody.result;
    responseBody = await checkProxyVerificationStatus(etherscanApi, guid);

    while (responseBody.result === 'Pending in queue') {
      await delay(3000);
      responseBody = await checkProxyVerificationStatus(etherscanApi, guid);
    }
  }

  if (responseBody.status === RESPONSE_OK) {
    console.log('Successfully linked proxy to implementation.');
  } else {
    recordError(`Failed to link proxy ${proxyAddress} with its implementation. Reason: ${responseBody.result}`, errors);
  }

  async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function checkProxyVerificationStatus(etherscanApi: EtherscanAPIConfig, guid: string) {
  const checkProxyVerificationParams = {
    module: 'contract',
    action: 'checkproxyverification',
    apikey: etherscanApi.key,
    guid: guid,
  };
  return await callEtherscanApi(etherscanApi, checkProxyVerificationParams);
}

/**
 * Gets the constructor args from the given transaction input and creation code.
 *
 * @param txInput The transaction input that was used to deploy the contract.
 * @param creationCode The contract creation code.
 * @returns the encoded constructor args, or undefined if txInput does not start with the creationCode.
 */
function inferConstructorArgs(txInput: string, creationCode: string) {
  if (txInput.startsWith(creationCode)) {
    return txInput.substring(creationCode.length);
  } else {
    return undefined;
  }
}
