import type { BuildInfo, ArtifactManager } from 'hardhat/types/artifacts';
import type { SolidityBuildInfoOutput, CompilerInput, CompilerOutput } from 'hardhat/types/solidity';
import { readJsonFile } from '@nomicfoundation/hardhat-utils/fs';

/**
 * Combined build info with output, compatible with legacy format expectations.
 * This matches the structure expected by code that was written for Hardhat 2.
 * The output field contains at minimum the contracts property, but may have other
 * properties depending on the compiler output format.
 */
export interface CombinedBuildInfo {
  _format: string;
  id: string;
  solcVersion: string;
  solcLongVersion: string;
  input: CompilerInput;
  output: {
    contracts: {
      [inputSourceName: string]: {
        [contractName: string]: any;
      };
    };
    [key: string]: any;
  };
}

/**
 * Gets the BuildInfo for a given contract name or fully qualified name.
 * 
 * This utility uses the public API of Hardhat's ArtifactManager to retrieve
 * the full BuildInfo object, which includes compilation details, compiler version,
 * and all contract artifacts from a compilation unit.
 * 
 * @param artifactManager - The ArtifactManager instance from hre.artifacts
 * @param contractNameOrFullyQualifiedName - Contract name or fully qualified name (e.g., "MyContract" or "contracts/MyContract.sol:MyContract")
 * @returns The BuildInfo object or undefined if not found
 * 
 * @example
 * ```typescript
 * const buildInfo = await getBuildInfo(hre.artifacts, 'MyContract');
 * if (buildInfo) {
 *   console.log('Solidity version:', buildInfo.solcVersion);
 *   console.log('Input:', buildInfo.input);
 * }
 * ```
 */
export async function getBuildInfo(
  artifactManager: ArtifactManager,
  contractNameOrFullyQualifiedName: string,
): Promise<BuildInfo | undefined> {
  // Get the build info ID from the artifact
  const buildInfoId = await artifactManager.getBuildInfoId(
    contractNameOrFullyQualifiedName,
  );

  if (buildInfoId === undefined) {
    return undefined;
  }

  // Get the build info file path
  const buildInfoPath = await artifactManager.getBuildInfoPath(buildInfoId);

  if (buildInfoPath === undefined) {
    return undefined;
  }

  // Read and return the build info
  return readJsonFile(buildInfoPath);
}

/**
 * Gets the combined BuildInfo with output for a given contract name or fully qualified name.
 * 
 * In Hardhat 3, build info and output are stored separately. This utility combines them
 * into a single object for backwards compatibility with code expecting the Hardhat 2 format.
 * 
 * @param artifactManager - The ArtifactManager instance from hre.artifacts
 * @param contractNameOrFullyQualifiedName - Contract name or fully qualified name (e.g., "MyContract" or "contracts/MyContract.sol:MyContract")
 * @returns The combined BuildInfo with output, or undefined if not found
 * 
 * @example
 * ```typescript
 * const buildInfo = await getCombinedBuildInfo(hre.artifacts, 'MyContract');
 * if (buildInfo) {
 *   console.log('Solidity version:', buildInfo.solcVersion);
 *   console.log('Contracts:', Object.keys(buildInfo.output.contracts));
 * }
 * ```
 */
export async function getCombinedBuildInfo(
  artifactManager: ArtifactManager,
  contractNameOrFullyQualifiedName: string,
): Promise<CombinedBuildInfo | undefined> {
  // Get the build info ID from the artifact
  const buildInfoId = await artifactManager.getBuildInfoId(
    contractNameOrFullyQualifiedName,
  );

  if (buildInfoId === undefined) {
    return undefined;
  }

  // Get the build info file path
  const buildInfoPath = await artifactManager.getBuildInfoPath(buildInfoId);

  if (buildInfoPath === undefined) {
    return undefined;
  }

  // Get the build info output path
  const buildInfoOutputPath = await artifactManager.getBuildInfoOutputPath(buildInfoId);

  if (buildInfoOutputPath === undefined) {
    return undefined;
  }

  // Read both files
  const buildInfo: BuildInfo = await readJsonFile(buildInfoPath);
  const buildInfoOutput: SolidityBuildInfoOutput = await readJsonFile(buildInfoOutputPath);

  if (!buildInfoOutput.output.contracts) {
    return undefined;
  }

  // Combine them into the legacy format
  return {
    _format: buildInfo._format,
    id: buildInfo.id,
    solcVersion: buildInfo.solcVersion,
    solcLongVersion: buildInfo.solcLongVersion,
    input: buildInfo.input,
    output: buildInfoOutput.output as CombinedBuildInfo['output'],
  };
}
