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
  getCode,
} from '@openzeppelin/upgrades-core';
import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info-v5.json';

import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

import { keccak256 } from 'ethereumjs-util';

import debug from './utils/debug.js';
import {
  callEtherscanApi,
  getEtherscanFromConnection,
  RESPONSE_OK,
  verifyAndGetStatus,
  type Etherscan,
  type EtherscanVerifyArgs,
} from './utils/etherscan-api.js';

/**
 * Hardhat artifact for a precompiled contract
 */
interface ContractArtifact {
  contractName: string;
  sourceName: string;
  abi: unknown;
  bytecode: string;
  deployedBytecode: string;
}

/**
 * A contract artifact and the corresponding event that it logs during construction.
 */
interface VerifiableContractInfo {
  artifact: ContractArtifact;
  event: string;
}

interface ErrorReport {
  errors: string[];
  severity: 'error' | 'warn';
}

/**
 * Etherscan API response when getting event logs by address and topic.
 */
interface EtherscanEventResponse {
  topics: string[];
  transactionHash: string;
}

const verifiableContracts = {
  erc1967proxy: { artifact: ERC1967Proxy as ContractArtifact, event: 'Upgraded(address)' },
  beaconProxy: { artifact: BeaconProxy as ContractArtifact, event: 'BeaconUpgraded(address)' },
  upgradeableBeacon: {
    artifact: UpgradeableBeacon as ContractArtifact,
    event: 'OwnershipTransferred(address,address)',
  },
  transparentUpgradeableProxy: {
    artifact: TransparentUpgradeableProxy as ContractArtifact,
    event: 'AdminChanged(address,address)',
  },
  proxyAdmin: { artifact: ProxyAdmin as ContractArtifact, event: 'OwnershipTransferred(address,address)' },
};

/**
 * Overrides hardhat-verify's verify flow to fully verify a proxy or beacon.
 * Verifies the contract at an address. If the address is an ERC-1967 compatible proxy, verifies the proxy and associated proxy contracts,
 * as well as the implementation. Otherwise, calls hardhat-verify's verify function directly.
 *
 * Requires @nomicfoundation/hardhat-verify v3.0.10+ and uses verification.etherscan from hre.network.connect().
 */
export async function verify(
  args: Record<string, unknown>,
  hre: HardhatRuntimeEnvironment,
  runSuper: (taskArguments: Record<string, unknown>) => Promise<unknown>,
): Promise<unknown> {
  const connection = await hre.network.connect();
  const { provider } = connection;
  const proxyAddress = args.address as string;
  const errorReport: ErrorReport = {
    errors: [],
    severity: 'error',
  };

  let proxy = true;

  async function hardhatVerify(address: string): Promise<unknown> {
    return await runSuper({ ...args, address });
  }

  if (await isTransparentOrUUPSProxy(provider, proxyAddress)) {
    await fullVerifyTransparentOrUUPS(hre, proxyAddress, hardhatVerify, errorReport);
  } else if (await isBeaconProxy(provider, proxyAddress)) {
    await fullVerifyBeaconProxy(hre, proxyAddress, hardhatVerify, errorReport);
  } else if (await isBeacon(provider, proxyAddress)) {
    proxy = false;
    const etherscan = await getEtherscanFromConnection(hre);
    await fullVerifyBeacon(hre, proxyAddress, hardhatVerify, etherscan, errorReport);
  } else {
    return await hardhatVerify(proxyAddress);
  }

  if (errorReport.errors.length > 0) {
    displayErrorReport(errorReport);
  } else {
    console.info(`\n${proxy ? 'Proxy' : 'Contract'} fully verified.`);
  }

  return undefined;
}

function displayErrorReport(errorReport: ErrorReport): void {
  let summary = `\nVerification completed with the following ${
    errorReport.severity === 'error' ? 'errors' : 'warnings'
  }.`;
  for (let i = 0; i < errorReport.errors.length; i++) {
    summary += `\n\n${errorReport.severity === 'error' ? 'Error' : 'Warning'} ${i + 1}: ${errorReport.errors[i]}`;
  }
  if (errorReport.severity === 'error') {
    throw new UpgradesError(summary);
  } else {
    console.warn(summary);
  }
}

function recordVerificationError(
  address: string,
  contractType: string,
  details: string,
  errorReport: ErrorReport,
): void {
  const message = `Failed to verify ${contractType} contract at ${address}: ${details}`;
  recordError(message, errorReport);
}

function recordError(message: string, errorReport: ErrorReport): void {
  console.error(message);
  errorReport.errors.push(message);
}

class EventOrFunctionNotFound extends UpgradesError {}

class EventsNotFound extends EventOrFunctionNotFound {
  constructor(address: string, events: string[]) {
    super(
      `Could not find an event with any of the following topics in the logs for address ${address}: ${events.join(', ')}`,
      () =>
        'If the proxy was recently deployed, the transaction may not be available on Etherscan yet. Try running the verify task again after waiting a few blocks.',
    );
  }
}

class BytecodeNotMatchArtifact extends Error {
  contractName: string;
  constructor(message: string, contractName: string) {
    super(message);
    this.contractName = contractName;
  }
}

async function fullVerifyTransparentOrUUPS(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  hardhatVerify: (address: string) => Promise<unknown>,
  errorReport: ErrorReport,
): Promise<void> {
  const connection = await hre.network.connect();
  const implAddress = await getImplementationAddress(connection.provider, proxyAddress);
  await verifyImplementation(hardhatVerify, implAddress, errorReport);

  const etherscan = await getEtherscanFromConnection(hre);

  await verifyTransparentOrUUPS();
  await linkProxyWithImplementationAbi(etherscan, proxyAddress, implAddress, errorReport);
  await verifyAdmin();

  async function verifyAdmin(): Promise<void> {
    const adminAddress = await getAdminAddress(connection.provider, proxyAddress);
    if (!isEmptySlot(adminAddress)) {
      console.log(`Verifying proxy admin: ${adminAddress}`);
      await verifyAdminOrFallback(hre, hardhatVerify, etherscan, adminAddress, errorReport);
    }
  }

  async function verifyTransparentOrUUPS(): Promise<void> {
    console.log(`Verifying proxy: ${proxyAddress}`);
    await verifyWithArtifactOrFallback(
      hre,
      hardhatVerify,
      etherscan,
      proxyAddress,
      [verifiableContracts.transparentUpgradeableProxy, verifiableContracts.erc1967proxy],
      errorReport,
      true,
    );
  }
}

async function verifyAdminOrFallback(
  hre: HardhatRuntimeEnvironment,
  hardhatVerify: (address: string) => Promise<unknown>,
  etherscan: Etherscan,
  adminAddress: string,
  errorReport: ErrorReport,
): Promise<void> {
  const attemptVerify = async (): Promise<void> => {
    let encodedOwner: string;
    const response = await getEventResponse(adminAddress, verifiableContracts.proxyAdmin.event, etherscan);
    if (response === undefined) {
      throw new EventsNotFound(adminAddress, [verifiableContracts.proxyAdmin.event]);
    } else if (response.topics.length !== 3) {
      throw new EventOrFunctionNotFound(
        `Unexpected number of topics in event logs for ${verifiableContracts.proxyAdmin.event} from ${adminAddress}. Expected 3, got ${response.topics.length}: ${response.topics}`,
        () => `The contract at ${adminAddress} does not appear to be a known proxy admin contract.`,
      );
    } else {
      encodedOwner = response.topics[2].replace(/^0x/, '');
    }

    const artifact = verifiableContracts.proxyAdmin.artifact;
    const connection = await hre.network.connect();
    const deployedBytecode = await getCode(connection.provider, adminAddress);
    if (deployedBytecode !== artifact.deployedBytecode) {
      throw new BytecodeNotMatchArtifact(
        `Bytecode does not match with the current version of ${artifact.contractName} in the Hardhat Upgrades plugin.`,
        artifact.contractName,
      );
    }

    await verifyContractWithConstructorArgs(etherscan, adminAddress, artifact, encodedOwner, errorReport);
  };

  await attemptVerifyOrFallback(attemptVerify, hardhatVerify, adminAddress, errorReport, false);
}

async function fullVerifyBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  hardhatVerify: (address: string) => Promise<unknown>,
  errorReport: ErrorReport,
): Promise<void> {
  const connection = await hre.network.connect();
  const beaconAddress = await getBeaconAddress(connection.provider, proxyAddress);
  const implAddress = await getImplementationAddressFromBeacon(connection.provider, beaconAddress);
  const etherscan = await getEtherscanFromConnection(hre);

  await fullVerifyBeacon(hre, beaconAddress, hardhatVerify, etherscan, errorReport);
  await verifyBeaconProxy();
  await linkProxyWithImplementationAbi(etherscan, proxyAddress, implAddress, errorReport);

  async function verifyBeaconProxy(): Promise<void> {
    console.log(`Verifying beacon proxy: ${proxyAddress}`);
    await verifyWithArtifactOrFallback(
      hre,
      hardhatVerify,
      etherscan,
      proxyAddress,
      [verifiableContracts.beaconProxy],
      errorReport,
      true,
    );
  }
}

async function fullVerifyBeacon(
  hre: HardhatRuntimeEnvironment,
  beaconAddress: string,
  hardhatVerify: (address: string) => Promise<unknown>,
  etherscan: Etherscan,
  errorReport: ErrorReport,
): Promise<void> {
  const connection = await hre.network.connect();
  const implAddress = await getImplementationAddressFromBeacon(connection.provider, beaconAddress);
  await verifyImplementation(hardhatVerify, implAddress, errorReport);
  await verifyBeacon();

  async function verifyBeacon(): Promise<void> {
    console.log(`Verifying beacon or beacon-like contract: ${beaconAddress}`);
    await verifyWithArtifactOrFallback(
      hre,
      hardhatVerify,
      etherscan,
      beaconAddress,
      [verifiableContracts.upgradeableBeacon],
      errorReport,
      true,
    );
  }
}

async function verifyImplementation(
  hardhatVerify: (address: string) => Promise<unknown>,
  implAddress: string,
  errorReport: ErrorReport,
): Promise<void> {
  try {
    console.log(`Verifying implementation: ${implAddress}`);
    await hardhatVerify(implAddress);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes('already verified')) {
      console.log(`Implementation ${implAddress} already verified.`);
    } else {
      recordVerificationError(implAddress, 'implementation', message, errorReport);
    }
  }
}

async function searchEvent(
  etherscan: Etherscan,
  address: string,
  possibleContractInfo: VerifiableContractInfo[],
): Promise<{ contractInfo: VerifiableContractInfo; txHash: string }> {
  for (let i = 0; i < possibleContractInfo.length; i++) {
    const contractInfo = possibleContractInfo[i];
    const txHash = await getContractCreationTxHash(address, contractInfo.event, etherscan);
    if (txHash !== undefined) {
      return { contractInfo, txHash };
    }
  }

  const events = possibleContractInfo.map(ci => ci.event);
  throw new EventsNotFound(address, events);
}

async function attemptVerifyOrFallback(
  attemptVerify: () => Promise<void>,
  hardhatVerify: (address: string) => Promise<unknown>,
  address: string,
  errorReport: ErrorReport,
  convertErrorsToWarningsOnFallbackSuccess: boolean,
): Promise<void> {
  try {
    await attemptVerify();
    return;
  } catch (origError: unknown) {
    if (origError instanceof BytecodeNotMatchArtifact || origError instanceof EventOrFunctionNotFound) {
      try {
        await hardhatVerify(address);
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        if (fallbackMessage.toLowerCase().includes('already verified')) {
          console.log(`Contract at ${address} already verified.`);
        } else {
          if (origError instanceof BytecodeNotMatchArtifact) {
            recordVerificationError(address, origError.contractName, origError.message, errorReport);
          } else {
            recordError(origError instanceof Error ? origError.message : String(origError), errorReport);
          }
          recordError(`Failed to verify directly using hardhat verify: ${fallbackMessage}`, errorReport);
          return;
        }
      }
      if (convertErrorsToWarningsOnFallbackSuccess) {
        errorReport.severity = 'warn';
      }
    } else {
      throw origError;
    }
  }
}

async function verifyWithArtifactOrFallback(
  hre: HardhatRuntimeEnvironment,
  hardhatVerify: (address: string) => Promise<unknown>,
  etherscan: Etherscan,
  address: string,
  possibleContractInfo: VerifiableContractInfo[],
  errorReport: ErrorReport,
  convertErrorsToWarningsOnFallbackSuccess: boolean,
): Promise<void> {
  const attemptVerify = (): Promise<void> =>
    attemptVerifyWithCreationEvent(hre, etherscan, address, possibleContractInfo, errorReport);
  await attemptVerifyOrFallback(
    attemptVerify,
    hardhatVerify,
    address,
    errorReport,
    convertErrorsToWarningsOnFallbackSuccess,
  );
}

async function attemptVerifyWithCreationEvent(
  hre: HardhatRuntimeEnvironment,
  etherscan: Etherscan,
  address: string,
  possibleContractInfo: VerifiableContractInfo[],
  errorReport: ErrorReport,
): Promise<void> {
  const { contractInfo, txHash } = await searchEvent(etherscan, address, possibleContractInfo);
  debug(`verifying contract ${contractInfo.artifact.contractName} at ${address}`);

  const connection = await hre.network.connect();
  const tx = await getTransactionByHash(connection.provider, txHash);
  if (tx === null) {
    throw new UpgradesError(`The transaction hash ${txHash} from the contract's logs was not found on the network`);
  }

  const constructorArguments = inferConstructorArgs(tx.input, contractInfo.artifact.bytecode);
  if (constructorArguments === undefined) {
    throw new BytecodeNotMatchArtifact(
      `Bytecode does not match with the current version of ${contractInfo.artifact.contractName} in the Hardhat Upgrades plugin.`,
      contractInfo.artifact.contractName,
    );
  }
  await verifyContractWithConstructorArgs(etherscan, address, contractInfo.artifact, constructorArguments, errorReport);
}

async function verifyContractWithConstructorArgs(
  etherscan: Etherscan,
  address: string,
  artifact: ContractArtifact,
  constructorArguments: string,
  errorReport: ErrorReport,
): Promise<void> {
  debug(`verifying contract ${address} with constructor args ${constructorArguments}`);

  const buildInfo = artifactsBuildInfo as { input: EtherscanVerifyArgs['compilerInput']; solcLongVersion: string };
  const params: EtherscanVerifyArgs = {
    contractAddress: address,
    compilerInput: buildInfo.input,
    contractName: `${artifact.sourceName}:${artifact.contractName}`,
    compilerVersion: `v${buildInfo.solcLongVersion}`,
    constructorArguments,
  };

  try {
    const status = await verifyAndGetStatus(params, etherscan);

    if (status.success) {
      console.log(`Successfully verified contract ${artifact.contractName} at ${address}.`);
    } else {
      recordVerificationError(address, artifact.contractName, status.message, errorReport);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes('already verified')) {
      console.log(`Contract at ${address} already verified.`);
    } else {
      recordVerificationError(address, artifact.contractName, message, errorReport);
    }
  }
}

async function getEventResponse(
  address: string,
  topic: string,
  etherscan: Etherscan,
): Promise<EtherscanEventResponse | undefined> {
  const params = {
    module: 'logs',
    action: 'getLogs',
    fromBlock: '0',
    toBlock: 'latest',
    address,
    topic0: '0x' + keccak256(Buffer.from(topic)).toString('hex'),
  };

  const responseBody = await callEtherscanApi(etherscan, params);

  if (responseBody.status === RESPONSE_OK) {
    const result = responseBody.result as EtherscanEventResponse[];
    return result[0];
  } else if (responseBody.message === 'No records found' || responseBody.message === 'No logs found') {
    debug(`no result found for event topic ${topic} at address ${address}`);
    return undefined;
  } else {
    throw new UpgradesError(
      `Failed to get logs for contract at address ${address}.`,
      () => `Etherscan returned with message: ${responseBody.message}, reason: ${responseBody.result}`,
    );
  }
}

async function getContractCreationTxHash(
  address: string,
  topic: string,
  etherscan: Etherscan,
): Promise<string | undefined> {
  const eventResponse = await getEventResponse(address, topic, etherscan);
  return eventResponse?.transactionHash;
}

async function linkProxyWithImplementationAbi(
  etherscan: Etherscan,
  proxyAddress: string,
  implAddress: string,
  errorReport: ErrorReport,
): Promise<void> {
  console.log(`Linking proxy ${proxyAddress} with implementation`);
  const params = {
    module: 'contract',
    action: 'verifyproxycontract',
    address: proxyAddress,
    expectedimplementation: implAddress,
  };
  let responseBody = await callEtherscanApi(etherscan, params);

  if (responseBody.status === RESPONSE_OK) {
    const guid = responseBody.result as string;
    responseBody = await checkProxyVerificationStatus(etherscan, guid);

    while (responseBody.result === 'Pending in queue') {
      await delay(3000);
      responseBody = await checkProxyVerificationStatus(etherscan, guid);
    }
  }

  if (responseBody.status === RESPONSE_OK) {
    console.log('Successfully linked proxy to implementation.');
  } else {
    recordError(
      `Failed to link proxy ${proxyAddress} with its implementation. Reason: ${responseBody.result}`,
      errorReport,
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkProxyVerificationStatus(
  etherscan: Etherscan,
  guid: string,
): Promise<{ status: string; message: string; result: unknown }> {
  const params = {
    module: 'contract',
    action: 'checkproxyverification',
    guid,
  };
  return (await callEtherscanApi(etherscan, params)) as { status: string; message: string; result: unknown };
}

function inferConstructorArgs(txInput: string, creationCode: string): string | undefined {
  if (txInput.startsWith(creationCode)) {
    return txInput.substring(creationCode.length);
  }
  return undefined;
}
