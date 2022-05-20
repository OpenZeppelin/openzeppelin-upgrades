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
 * A mapping from a contract artifact to the event that it logs during construction.
 */
interface ContractEventMapping {
  artifact: ContractArtifact;
  event: string;
}

/**
 * Types of proxy-related contracts and their corresponding events.
 */
interface ContractEventsMap {
  erc1967proxy: ContractEventMapping;
  beaconProxy: ContractEventMapping;
  upgradeableBeacon: ContractEventMapping;
  transparentUpgradeableProxy: ContractEventMapping;
  proxyAdmin: ContractEventMapping;
}

/**
 * The proxy-related contracts and their corresponding events that may have been deployed the current version of this plugin.
 */
const contractEventsMap: ContractEventsMap = {
  erc1967proxy: { artifact: ERC1967Proxy, event: 'Upgraded(address)' },
  beaconProxy: { artifact: BeaconProxy, event: 'BeaconUpgraded(address)' },
  upgradeableBeacon: { artifact: UpgradeableBeacon, event: 'OwnershipTransferred(address,address)' },
  transparentUpgradeableProxy: { artifact: TransparentUpgradeableProxy, event: 'AdminChanged(address,address)' },
  proxyAdmin: { artifact: ProxyAdmin, event: 'OwnershipTransferred(address,address)' },
};

const errors: string[] = [];

/**
 * Overrides hardhat-etherscan's verify function to fully verify a proxy.
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
      'The hardhat-etherscan plugin must be defined before the hardhat-upgrades plugin.',
      () =>
        'Define the plugins in the following order in hardhat.config.js:\n' +
        '  require("@nomiclabs/hardhat-etherscan");\n' +
        '  require("@openzeppelin/hardhat-upgrades");\n' +
        'Or if you are using Typescript, define the plugins in the following order in hardhat.config.ts:\n' +
        '  import "@nomiclabs/hardhat-etherscan";\n' +
        '  import "@openzeppelin/hardhat-upgrades";\n',
    );
  }

  const provider = hre.network.provider;
  const proxyAddress = args.address;

  if (await isTransparentOrUUPSProxy(provider, proxyAddress)) {
    await fullVerifyTransparentOrUUPS(hre, proxyAddress, hardhatVerify);
  } else if (await isBeaconProxy(provider, proxyAddress)) {
    await fullVerifyBeaconProxy(hre, proxyAddress, hardhatVerify);
  } else {
    // Doesn't look like a proxy, so just verify directly
    return hardhatVerify(proxyAddress);
  }

  if (errors.length > 0) {
    throw new UpgradesError(getVerificationErrors());
  }

  console.info('\nProxy fully verified.');

  async function hardhatVerify(address: string) {
    return await runSuper({ ...args, address });
  }
}

/**
 * @returns Formatted summary of all of the verification errors that have been recorded.
 */
function getVerificationErrors() {
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
 */
function recordVerificationError(address: string, contractType: string, details: string) {
  const message = `Failed to verify ${contractType} contract at ${address}: ${details}`;
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
 */
async function fullVerifyTransparentOrUUPS(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: any,
  hardhatVerify: (address: string) => Promise<any>,
) {
  const provider = hre.network.provider;
  const implAddress = await getImplementationAddress(provider, proxyAddress);
  await verifyImplementation(hardhatVerify, implAddress);

  const etherscanApi = await getEtherscanAPIConfig(hre);

  await verifyTransparentOrUUPS();
  await linkProxyWithImplementationAbi(etherscanApi, proxyAddress);
  // Either UUPS or Transparent proxy could have admin slot set, although typically this should only be for Transparent
  await verifyAdmin();

  async function verifyAdmin() {
    const adminAddress = await getAdminAddress(provider, proxyAddress);
    if (!isEmptySlot(adminAddress)) {
      console.log(`Verifying proxy admin: ${adminAddress}`);
      try {
        await verifyContractWithCreationEvent(hre, etherscanApi, adminAddress, contractEventsMap.proxyAdmin);
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
    try {
      await verifyContractWithCreationEvent(
        hre,
        etherscanApi,
        proxyAddress,
        contractEventsMap.transparentUpgradeableProxy,
      );
    } catch (e: any) {
      if (e instanceof EventNotFound) {
        await verifyContractWithCreationEvent(hre, etherscanApi, proxyAddress, contractEventsMap.erc1967proxy);
      }
    }
  }
}

/**
 * Fully verifies all contracts related to the given beacon proxy address: implementation, beacon, and beacon proxy.
 * Also links the proxy to the implementation ABI on Etherscan.
 *
 * @param hre
 * @param proxyAddress The beacon proxy address
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 */
async function fullVerifyBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: any,
  hardhatVerify: (address: string) => Promise<any>,
) {
  const provider = hre.network.provider;
  const beaconAddress = await getBeaconAddress(provider, proxyAddress);

  const implAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
  await verifyImplementation(hardhatVerify, implAddress);

  const etherscanApi = await getEtherscanAPIConfig(hre);

  await verifyBeacon();
  await verifyBeaconProxy();
  await linkProxyWithImplementationAbi(etherscanApi, proxyAddress);

  async function verifyBeaconProxy() {
    console.log(`Verifying beacon proxy: ${proxyAddress}`);
    await verifyContractWithCreationEvent(hre, etherscanApi, proxyAddress, contractEventsMap.beaconProxy);
  }

  async function verifyBeacon() {
    console.log(`Verifying beacon: ${beaconAddress}`);
    await verifyContractWithCreationEvent(hre, etherscanApi, beaconAddress, contractEventsMap.upgradeableBeacon);
  }
}

/**
 * Runs hardhat-etherscan plugin's verify command on the given implementation address.
 *
 * @param hardhatVerify A function that invokes the hardhat-etherscan plugin's verify command
 * @param implAddress The implementation address
 */
async function verifyImplementation(hardhatVerify: (address: string) => Promise<any>, implAddress: string) {
  try {
    console.log(`Verifying implementation: ${implAddress}`);
    await hardhatVerify(implAddress);
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log(`Implementation ${implAddress} already verified.`);
    } else {
      recordVerificationError(implAddress, 'implementation', e.message);
    }
  }
}

/**
 * Verifies a contract by looking up an event that should have been logged during contract construction,
 * finds the txhash for that, and infers the constructor args to use for verification.
 *
 * @param hre
 * @param etherscanApi The Etherscan API config
 * @param address The contract address to verify
 * @param contractEventMapping The contract artifact to use for verification along with the creation event expected in the logs.
 * @throws {EventNotFound} if the event was not found in the contract's logs according to Etherscan.
 */
async function verifyContractWithCreationEvent(
  hre: HardhatRuntimeEnvironment,
  etherscanApi: EtherscanAPIConfig,
  address: string,
  contractEventMapping: ContractEventMapping,
) {
  debug(`verifying contract ${contractEventMapping.artifact.contractName} at ${address}`);

  const txHash = await getContractCreationTxHash(address, contractEventMapping.event, etherscanApi);
  if (txHash === undefined) {
    throw new EventNotFound(
      `Could not find an event with the topic ${contractEventMapping.event} in the logs for address ${address}`,
    );
  }

  const tx = await getTransactionByHash(hre.network.provider, txHash);
  if (tx === null) {
    // This should not happen since the txHash came from the logged event itself
    throw new UpgradesError(`The transaction hash ${txHash} from the contract's logs was not found on the network`);
  }

  const constructorArguments = inferConstructorArgs(tx.input, contractEventMapping.artifact.bytecode);
  if (constructorArguments === undefined) {
    // The creation bytecode for the address does not match with the expected artifact.
    // This may be because a different version of the contract was deployed compared to what is in the plugins.
    recordVerificationError(
      address,
      contractEventMapping.artifact.contractName,
      `Bytecode does not match with the current version of ${contractEventMapping.artifact.contractName} in the Hardhat Upgrades plugin.`,
    );
  } else {
    await verifyContractWithConstructorArgs(etherscanApi, address, contractEventMapping.artifact, constructorArguments);
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
      recordVerificationError(address, artifact.contractName, status.message);
    }
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log(`Contract at ${address} already verified.`);
    } else {
      recordVerificationError(address, artifact.contractName, e.message);
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
export async function getContractCreationTxHash(
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
 */
export async function linkProxyWithImplementationAbi(etherscanApi: EtherscanAPIConfig, proxyAddress: string) {
  console.log(`Linking proxy ${proxyAddress} with implementation`);
  const params = {
    module: 'contract',
    action: 'verifyproxycontract',
    address: proxyAddress,
  };
  const responseBody = await callEtherscanApi(etherscanApi, params);

  if (responseBody.status === RESPONSE_OK) {
    console.log('Successfully linked proxy to implementation.');
  } else {
    throw new UpgradesError(
      `Failed to link proxy ${proxyAddress} with its implementation.`,
      () => `Etherscan returned with reason: ${responseBody.result}`,
    );
  }
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
