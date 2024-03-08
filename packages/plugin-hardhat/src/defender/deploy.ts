import type { ethers, ContractFactory } from 'ethers';
import { CompilerInput, CompilerOutputContract, HardhatRuntimeEnvironment } from 'hardhat/types';

import { parseFullyQualifiedName } from 'hardhat/utils/contract-names';

import {
  DeploymentResponse,
  SourceCodeLicense,
  DeployContractRequest,
  DeployRequestLibraries,
} from '@openzeppelin/defender-sdk-deploy-client';
import {
  Deployment,
  RemoteDeploymentId,
  getContractNameAndRunValidation,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info-v5.json';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';

import { getNetwork, parseTxOverrides } from './utils';
import { DeployTransaction, DefenderDeployOptions, UpgradeOptions, EthersDeployOptions } from '../utils';
import debug from '../utils/debug';
import { getDeployData } from '../utils/deploy-impl';
import { ContractSourceNotFoundError } from '@openzeppelin/upgrades-core';
import { getDeployClient } from './client';

const deployableProxyContracts = [ERC1967Proxy, BeaconProxy, UpgradeableBeacon, TransparentUpgradeableProxy];

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
  libraries?: DeployRequestLibraries;
}

type CompilerOutputWithMetadata = CompilerOutputContract & {
  metadata?: string;
};

export async function defenderDeploy(
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  opts: UpgradeOptions & EthersDeployOptions & DefenderDeployOptions,
  ...args: unknown[]
): Promise<Required<Deployment & RemoteDeploymentId> & DeployTransaction> {
  const client = getDeployClient(hre);

  const constructorArgs = [...args] as (string | number | boolean)[];
  const contractInfo = await getContractInfo(hre, factory, { constructorArgs, ...opts });
  const network = await getNetwork(hre);
  debug(`Network ${network}`);

  const verifySourceCode = opts.verifySourceCode ?? true;
  debug(`Verify source code: ${verifySourceCode}`);

  let license: string | undefined = undefined;
  if (verifySourceCode) {
    license = getLicenseFromMetadata(contractInfo);
    debug(`License type: ${license}`);
  }

  if (opts.salt !== undefined) {
    debug(`Salt: ${opts.salt}`);
  }

  const deploymentRequest: DeployContractRequest = {
    contractName: contractInfo.contractName,
    contractPath: contractInfo.sourceName,
    network: network,
    artifactPayload: JSON.stringify(contractInfo.buildInfo),
    licenseType: license as SourceCodeLicense | undefined, // cast without validation but catch error from API below
    constructorInputs: constructorArgs,
    verifySourceCode: verifySourceCode,
    relayerId: opts.relayerId,
    salt: opts.salt,
    createFactoryAddress: opts.createFactoryAddress,
    txOverrides: parseTxOverrides(opts.txOverrides),
    libraries: contractInfo.libraries,
  };

  let deploymentResponse: DeploymentResponse;
  try {
    deploymentResponse = await client.deployContract(deploymentRequest);
  } catch (e: any) {
    if (e.response?.data?.message?.includes('licenseType should be equal to one of the allowed values')) {
      throw new UpgradesError(
        `License type ${license} is not a valid SPDX license identifier for block explorer verification.`,
        () => 'Specify a valid SPDX-License-Identifier in your contract.',
      );
    } else {
      throw e;
    }
  }

  // For EOA or Safe deployments, address and/or txHash are not known until the deployment is completed.
  // In this case, prompt the user to submit the deployment in Defender, and wait for it to be completed.
  if (deploymentResponse.address === undefined || deploymentResponse.txHash === undefined) {
    console.log(
      `ACTION REQUIRED: Go to https://defender.openzeppelin.com/v2/#/deploy to submit the pending deployment.`,
    );
    console.log(`The process will continue automatically when the pending deployment is completed.`);
    console.log(
      `Waiting for pending deployment of contract ${contractInfo.contractName} with deployment id ${deploymentResponse.deploymentId}...`,
    );

    const pollInterval = opts.pollingInterval ?? 5e3;
    while (deploymentResponse.address === undefined || deploymentResponse.txHash === undefined) {
      debug(`Waiting for deployment id ${deploymentResponse.deploymentId} to return address and txHash...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      deploymentResponse = await client.getDeployedContract(deploymentResponse.deploymentId);
    }
  }

  const txResponse = (await hre.ethers.provider.getTransaction(deploymentResponse.txHash)) ?? undefined;
  const checksumAddress = hre.ethers.getAddress(deploymentResponse.address);
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
  let fullContractName, runValidation;
  let libraries: DeployRequestLibraries | undefined;
  try {
    // Get fully qualified contract name and link references from validations
    const deployData = await getDeployData(hre, factory, opts);
    [fullContractName, runValidation] = getContractNameAndRunValidation(deployData.validations, deployData.version);
    debug(`Contract ${fullContractName}`);

    // Get externally linked libraries
    const linkReferences = runValidation[fullContractName].linkReferences;
    for (const ref in linkReferences) {
      const linkedBytes = factory.bytecode.slice(2);

      const start = linkReferences[ref].start * 2;
      const length = linkReferences[ref].length * 2;

      const linkFullyQualifiedName: `${string}:${string}` = `${linkReferences[ref].src}:${linkReferences[ref].name}`;
      const linkAddress = `0x${linkedBytes.substring(start, start + length)}`;

      libraries ??= {};
      libraries[linkFullyQualifiedName] = linkAddress;
    }
    debug(`Libraries: ${JSON.stringify(libraries, null, 2)}`);
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

  return { sourceName, contractName, buildInfo, libraries };
}

/**
 * Get the license type from the contract metadata without validating its validity, except converts undefined or UNLICENSED to None.
 */
function getLicenseFromMetadata(contractInfo: ContractInfo): string {
  const compilerOutput: CompilerOutputWithMetadata =
    contractInfo.buildInfo.output.contracts[contractInfo.sourceName][contractInfo.contractName];

  const metadataString = compilerOutput.metadata;
  if (metadataString === undefined) {
    throw new UpgradesError(
      'License type could not be determined from contract metadata',
      () => 'Enable metadata output in your compiler settings.',
    );
  }

  const metadata = JSON.parse(metadataString);

  const license: string = metadata.sources[contractInfo.sourceName].license;
  if (license === undefined || license === 'UNLICENSED') {
    // UNLICENSED means no license according to solidity docs
    return 'None';
  } else {
    return license;
  }
}
