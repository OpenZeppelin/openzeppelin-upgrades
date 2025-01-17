import type { ethers, ContractFactory } from 'ethers';
import { CompilerInput, CompilerOutputContract, HardhatRuntimeEnvironment } from 'hardhat/types';

import { parseFullyQualifiedName } from 'hardhat/utils/contract-names';

import {
  DeploymentResponse,
  SourceCodeLicense,
  DeployContractRequest,
  DeployRequestLibraries,
} from '@openzeppelin/defender-sdk-deploy-client';
import { getContractNameAndRunValidation, UpgradesError } from '@openzeppelin/upgrades-core';

import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info-v5.json';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';

import { getNetwork, parseTxOverrides } from './utils';
import { DefenderDeployOptions, UpgradeOptions, EthersDeployOptions, DefenderDeployment } from '../utils';
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
  constructorBytecode: string;
}

type CompilerOutputWithMetadata = CompilerOutputContract & {
  metadata?: string;
};

const ORIGIN_HARDHAT: DeployContractRequest['origin'] = 'Hardhat';

export async function defenderDeploy(
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  opts: UpgradeOptions & EthersDeployOptions & DefenderDeployOptions,
  ...args: unknown[]
): Promise<DefenderDeployment> {
  const client = getDeployClient(hre);

  // Override constructor arguments in options with the ones passed as arguments to this function.
  // The ones in the options are for implementation contracts only, while this function
  // can be used to deploy proxies as well.
  const contractInfo = await getContractInfo(hre, factory, { ...opts, constructorArgs: args });
  const network = await getNetwork(hre);
  debug(`Network ${network}`);

  const verifySourceCode = opts.verifySourceCode ?? true;
  debug(`Verify source code: ${verifySourceCode}`);

  if (opts.salt !== undefined) {
    debug(`Salt: ${opts.salt}`);
  }

  if (opts.licenseType !== undefined) {
    if (opts.verifySourceCode === false) {
      throw new UpgradesError('The `licenseType` option cannot be used when the `verifySourceCode` option is `false`');
    } else if (opts.skipLicenseType) {
      throw new UpgradesError('The `licenseType` option cannot be used when the `skipLicenseType` option is `true`');
    }
  }

  let licenseType: SourceCodeLicense | undefined = undefined;
  if (verifySourceCode) {
    if (opts.licenseType !== undefined) {
      licenseType = opts.licenseType;
      debug(`licenseType option: ${licenseType}`);
    } else if (!opts.skipLicenseType) {
      const spdxIdentifier = getSpdxLicenseIdentifier(contractInfo);
      debug(`SPDX license identifier from metadata: ${spdxIdentifier}`);
      if (spdxIdentifier !== undefined) {
        licenseType = toLicenseType(spdxIdentifier, contractInfo);
        debug(`licenseType inferred: ${licenseType}`);
      }
    }
  }

  const deploymentRequest: DeployContractRequest = {
    contractName: contractInfo.contractName,
    contractPath: contractInfo.sourceName,
    network: network,
    artifactPayload: JSON.stringify(contractInfo.buildInfo),
    licenseType: licenseType,
    constructorBytecode: contractInfo.constructorBytecode,
    verifySourceCode: verifySourceCode,
    relayerId: opts.relayerId,
    salt: opts.salt,
    createFactoryAddress: opts.createFactoryAddress,
    txOverrides: parseTxOverrides(opts.txOverrides),
    libraries: contractInfo.libraries,
    metadata: opts.metadata,
    origin: ORIGIN_HARDHAT,
  };

  let deploymentResponse: DeploymentResponse;
  try {
    deploymentResponse = await client.deployContract(deploymentRequest);
  } catch (e: any) {
    if (e.response?.data?.message?.includes('licenseType should be equal to one of the allowed values')) {
      throw new UpgradesError(
        `The licenseType option "${licenseType}" is not valid for block explorer verification.`,
        () =>
          'See https://etherscan.io/contract-license-types for supported values and use the string found in brackets, e.g. "MIT"',
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
  opts: UpgradeOptions & Required<Pick<UpgradeOptions, 'constructorArgs'>>,
): Promise<ContractInfo> {
  let fullContractName, runValidation;
  let libraries: DeployRequestLibraries | undefined;
  let constructorBytecode: string;
  try {
    // Get fully qualified contract name and link references from validations
    const deployData = await getDeployData(hre, factory, opts);
    constructorBytecode = deployData.encodedArgs;
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
          return {
            sourceName,
            contractName,
            buildInfo,
            constructorBytecode: factory.interface.encodeDeploy(opts.constructorArgs),
          };
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

  return { sourceName, contractName, buildInfo, libraries, constructorBytecode };
}

/**
 * Get the SPDX license identifier from the contract metadata without validating it.
 */
function getSpdxLicenseIdentifier(contractInfo: ContractInfo): string | undefined {
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

  return metadata.sources[contractInfo.sourceName].license;
}

/**
 * Infers a SourceCodeLicense from an SPDX license identifier.
 */
function toLicenseType(spdxIdentifier: string, contractInfo: ContractInfo): SourceCodeLicense {
  switch (spdxIdentifier) {
    case 'UNLICENSED':
      return 'None';
    case 'Unlicense':
      return 'Unlicense';
    case 'MIT':
      return 'MIT';
    case 'GPL-2.0-only':
    case 'GPL-2.0-or-later':
      return 'GNU GPLv2';
    case 'GPL-3.0-only':
    case 'GPL-3.0-or-later':
      return 'GNU GPLv3';
    case 'LGPL-2.1-only':
    case 'LGPL-2.1-or-later':
      return 'GNU LGPLv2.1';
    case 'LGPL-3.0-only':
    case 'LGPL-3.0-or-later':
      return 'GNU LGPLv3';
    case 'BSD-2-Clause':
      return 'BSD-2-Clause';
    case 'BSD-3-Clause':
      return 'BSD-3-Clause';
    case 'MPL-2.0':
      return 'MPL-2.0';
    case 'OSL-3.0':
      return 'OSL-3.0';
    case 'Apache-2.0':
      return 'Apache-2.0';
    case 'AGPL-3.0-only':
    case 'AGPL-3.0-or-later':
      return 'GNU AGPLv3';
    case 'BUSL-1.1':
      return 'BSL 1.1';
    default:
      throw new UpgradesError(
        `SPDX license identifier ${spdxIdentifier} in ${contractInfo.sourceName} does not look like a supported license for block explorer verification.`,
        () =>
          `Use the \`licenseType\` option to specify a license type, or set the \`skipLicenseType\` option to \`true\` to skip.`,
      );
  }
}
