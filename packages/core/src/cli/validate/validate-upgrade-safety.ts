import path from 'path';
import { ValidationOptions, withValidationDefaults } from '../..';

import { BuildInfoFile, getBuildInfoFiles } from './build-info-file';
import { getContractReports } from './contract-report';
import { findContract } from './find-contract';
import {
  NamespacedCompilationUnavailableError,
  needsNamespacedLayouts,
  withNamespacedOutputs,
} from './namespaced-compilation';
import { ProjectReport, getProjectReport } from './project-report';
import { SourceContract, validateBuildInfoContracts } from './validations';

/**
 * Validation options for upgrade safety checks.
 */
export type ValidateUpgradeSafetyOptions = Omit<ValidationOptions, 'kind'> & {
  requireReference?: boolean;
};

export type SpecifiedContracts = {
  contract: SourceContract;
  reference?: SourceContract;
};

/**
 * Validates the upgrade safety of all contracts in the build info dir's build info files.
 * Only contracts that are detected as upgradeable will be validated.
 *
 * If the only storage layout errors are in namespaced storage, they are checked again with a detailed storage layout,
 * which has the slot and offset of each variable. This compiles the contracts again with the build info's Solidity
 * compiler version, which is downloaded from binaries.soliditylang.org to the user's cache directory the first time it
 * is needed.
 *
 * @param buildInfoDir Path of build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @param contract The name or fully qualified name of the contract to validate. If not specified, all upgradeable contracts in the build info directory will be validated.
 * @param reference The name or fully qualified name of the reference contract to use for storage layout comparisons. Can only be used along with `contract`. If not specified, uses the `@custom:oz-upgrades-from` annotation in the contract that is being validated.
 * @param opts Validation options, or undefined to use the default validation options.
 * @param referenceBuildInfoDirs Optional paths of additional build info directories from previous versions of the project to use for storage layout comparisons. When using this option, refer to one of these directories using prefix `<dirName>:` before the contract name or fully qualified name in the `reference` param or `@custom:oz-upgrades-from` annotation, where `<dirName>` is the directory short name. Each directory short name must be unique, including compared to the main build info directory.
 * @param exclude Exclude validations for contracts in source file paths that match any of the given glob patterns.
 * @returns The project report.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  contract?: string,
  reference?: string,
  opts: ValidateUpgradeSafetyOptions = {},
  referenceBuildInfoDirs?: string[],
  exclude?: string[],
): Promise<ProjectReport> {
  const allOpts = withCliDefaults(opts);

  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const referenceBuildInfoFiles = await getReferenceBuildInfoFiles(buildInfoFiles, referenceBuildInfoDirs);

  const report = getReport(buildInfoFiles, referenceBuildInfoFiles, allOpts, contract, reference, exclude);
  if (needsNamespacedLayouts(report)) {
    // The storage layout errors are all in namespaced storage, so check again with detailed storage layouts from
    // namespaced compilations
    let namespacedBuildInfoFiles: BuildInfoFile[];
    const namespacedReferenceBuildInfoFiles: Record<string, BuildInfoFile[]> = {};
    try {
      namespacedBuildInfoFiles = await withNamespacedOutputs(buildInfoFiles);
      for (const [key, files] of Object.entries(referenceBuildInfoFiles)) {
        namespacedReferenceBuildInfoFiles[key] = await withNamespacedOutputs(files);
      }
    } catch (e) {
      if (e instanceof NamespacedCompilationUnavailableError) {
        return new ProjectReport(report.upgradeableContractReports, report.specifiedContract, [
          `Namespaced storage was checked without a detailed storage layout. ${e.message}\n  > ${e.hint}`,
        ]);
      }
      throw e;
    }
    return getReport(
      namespacedBuildInfoFiles,
      namespacedReferenceBuildInfoFiles,
      allOpts,
      contract,
      reference,
      exclude,
    );
  } else {
    return report;
  }
}

/**
 * Gets the build info files of each reference build info directory, keyed by the directory's short name.
 */
async function getReferenceBuildInfoFiles(
  buildInfoFiles: BuildInfoFile[],
  referenceBuildInfoDirs?: string[],
): Promise<Record<string, BuildInfoFile[]>> {
  const referenceBuildInfoFiles: Record<string, BuildInfoFile[]> = {};
  const usedKeys = new Set(['']);
  if (buildInfoFiles.length > 0) {
    usedKeys.add(buildInfoFiles[0].dirShortName);
  }

  for (const referenceBuildInfoDir of referenceBuildInfoDirs ?? []) {
    const key = path.basename(referenceBuildInfoDir);

    if (usedKeys.has(key)) {
      throw new Error(`Reference build info directory short name '${key}' is not unique.`);
    }
    usedKeys.add(key);

    referenceBuildInfoFiles[key] = await getBuildInfoFiles(referenceBuildInfoDir);
  }
  return referenceBuildInfoFiles;
}

function getReport(
  buildInfoFiles: BuildInfoFile[],
  referenceBuildInfoFiles: Record<string, BuildInfoFile[]>,
  opts: Required<ValidateUpgradeSafetyOptions>,
  contract?: string,
  reference?: string,
  exclude?: string[],
): ProjectReport {
  const sourceContracts = validateBuildInfoContracts(buildInfoFiles);

  const buildInfoDictionary: BuildInfoDictionary = {};
  buildInfoDictionary[''] = sourceContracts;
  if (buildInfoFiles.length > 0) {
    buildInfoDictionary[buildInfoFiles[0].dirShortName] = sourceContracts;
  }
  for (const [key, files] of Object.entries(referenceBuildInfoFiles)) {
    buildInfoDictionary[key] = validateBuildInfoContracts(files);
  }

  const specifiedContracts = findSpecifiedContracts(buildInfoDictionary, opts, contract, reference);

  const contractReports = getContractReports(buildInfoDictionary, opts, specifiedContracts, exclude);
  return getProjectReport(contractReports, specifiedContracts !== undefined);
}

/**
 * Dictionary of build info directories and the contracts they contain.
 * Main build info directory can be found with the key '' and also with its short name.
 */
export interface BuildInfoDictionary {
  [buildInfoDirName: string]: SourceContract[];
}

export function findSpecifiedContracts(
  buildInfoDictionary: BuildInfoDictionary,
  opts: Required<ValidateUpgradeSafetyOptions>,
  contractName?: string,
  referenceName?: string,
): SpecifiedContracts | undefined {
  if (contractName !== undefined) {
    return {
      contract: findContract(contractName, undefined, buildInfoDictionary, true), // only search main build info dir for the specified contract
      reference: referenceName !== undefined ? findContract(referenceName, undefined, buildInfoDictionary) : undefined,
    };
  } else if (referenceName !== undefined) {
    throw new Error(`The reference option can only be specified when the contract option is also specified.`);
  } else if (opts.requireReference) {
    throw new Error(`The requireReference option can only be specified when the contract option is also specified.`);
  } else {
    return undefined;
  }
}

export function withCliDefaults(opts: ValidateUpgradeSafetyOptions): Required<ValidateUpgradeSafetyOptions> {
  if (opts.requireReference && opts.unsafeSkipStorageCheck) {
    throw new Error(`The requireReference and unsafeSkipStorageCheck options cannot be used at the same time.`);
  }
  return {
    ...withValidationDefaults(opts),
    requireReference: opts.requireReference ?? false,
  };
}
