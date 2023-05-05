import type { ethers, ContractFactory } from 'ethers';
import { CompilerInput, CompilerOutputContract, HardhatRuntimeEnvironment } from 'hardhat/types';

import { parseFullyQualifiedName } from 'hardhat/utils/contract-names';

import { SourceCodeLicense } from 'platform-deploy-client';
import {
  Deployment,
  RemoteDeploymentId,
  getContractNameAndRunValidation,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info.json';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

import { getNetwork, getPlatformClient } from './utils';
import { DeployTransaction, PlatformDeployOptions, UpgradeOptions } from '../utils';
import debug from '../utils/debug';
import { getDeployData } from '../utils/deploy-impl';
import { ContractSourceNotFoundError } from '@openzeppelin/upgrades-core';

const deployableProxyContracts = [
  ERC1967Proxy,
  BeaconProxy,
  UpgradeableBeacon,
  TransparentUpgradeableProxy,
  ProxyAdmin,
];

interface ReducedBuildInfo {
  _format: string;
  id: string;
  solcVersion: string;
  solcLongVersion: string;
  input: CompilerInput;
  output: {
    contracts: any;
  };
}

interface ContractInfo {
  sourceName: string;
  contractName: string;
  buildInfo: ReducedBuildInfo;
}

type CompilerOutputWithMetadata = CompilerOutputContract & {
  metadata?: string;
};

export async function platformDeploy(
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  opts: UpgradeOptions & PlatformDeployOptions,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction> & RemoteDeploymentId> {
  const client = getPlatformClient(hre);

  const constructorArgs = [...args] as (string | number | boolean)[];
  const contractInfo = await getContractInfo(hre, factory, { constructorArgs, ...opts });
  const network = await getNetwork(hre);
  debug(`Network ${network}`);

  const verifySourceCode = opts.verifySourceCode ?? true;

  const deploymentResponse = await client.Deployment.deploy({
    contractName: contractInfo.contractName,
    contractPath: contractInfo.sourceName,
    network: network,
    artifactPayload: JSON.stringify(contractInfo.buildInfo),
    licenseType: getLicenseFromMetadata(contractInfo),
    constructorInputs: constructorArgs,
    verifySourceCode: verifySourceCode,
    relayerId: opts.walletId,
  });

  const txResponse = await hre.ethers.provider.getTransaction(deploymentResponse.txHash);
  const checksumAddress = hre.ethers.utils.getAddress(deploymentResponse.address);
  return {
    address: checksumAddress,
    txHash: deploymentResponse.txHash,
    deployTransaction: txResponse,
    remoteDeploymentId: deploymentResponse.deploymentId,
  };
}

async function getContractInfo(
  hre: HardhatRuntimeEnvironment,
  factory: ethers.ContractFactory,
  opts: UpgradeOptions,
): Promise<ContractInfo> {
  let fullContractName;
  try {
    // Get fully qualified contract name from validations
    const deployData = await getDeployData(hre, factory, opts);
    [fullContractName] = getContractNameAndRunValidation(deployData.validations, deployData.version);
    debug(`Contract ${fullContractName}`);
  } catch (e) {
    if (e instanceof ContractSourceNotFoundError) {
      // Proxy contracts would not be found in the validations, so try to get these from the plugin's precompiled artifacts.
      for (const artifact of deployableProxyContracts) {
        if (artifact.bytecode === factory.bytecode) {
          const sourceName = artifact.sourceName;
          const contractName = artifact.contractName;
          const buildInfo = artifactsBuildInfo;
          debug(`Proxy contract ${sourceName}:${contractName}`);
          return { sourceName, contractName, buildInfo };
        }
      }
    }
    // If nothing else worked, re-throw error about the contract not being found.
    throw e;
  }

  const { sourceName, contractName } = parseFullyQualifiedName(fullContractName);
  // Get the build-info file corresponding to the fully qualified contract name
  const buildInfo = await hre.artifacts.getBuildInfo(fullContractName);
  if (buildInfo === undefined) {
    throw new UpgradesError(
      `Could not get Hardhat compilation artifact for contract ${fullContractName}`,
      () => `Run \`npx hardhat compile\``,
    );
  }
  return { sourceName, contractName, buildInfo };
}

function getLicenseFromMetadata(contractInfo: ContractInfo): SourceCodeLicense | undefined {
  const compilerOutput: CompilerOutputWithMetadata =
    contractInfo.buildInfo.output.contracts[contractInfo.sourceName][contractInfo.contractName];

  const metadataString = compilerOutput.metadata;
  if (metadataString === undefined) {
    debug('Metadata not found in compiler output');
    return undefined;
  }

  const metadata = JSON.parse(metadataString);

  const license = metadata.sources[contractInfo.sourceName].license;
  if (license === undefined) {
    debug('License not found in metadata');
  } else {
    debug(`Found license from metadata: ${license}`);
  }
  return license;
}
