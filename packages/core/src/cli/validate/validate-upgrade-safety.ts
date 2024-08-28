import path from 'path';
import { ValidationOptions, withValidationDefaults } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { getContractReports } from './contract-report';
import { findContract } from './find-contract';
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
  const sourceContracts = validateBuildInfoContracts(buildInfoFiles);

  const buildInfoDictionary: BuildInfoDictionary = {};
  buildInfoDictionary[''] = sourceContracts;
  if (buildInfoFiles.length > 0) {
    buildInfoDictionary[buildInfoFiles[0].dirShortName] = sourceContracts;
  }

  if (referenceBuildInfoDirs !== undefined) {
    for (const referenceBuildInfoDir of referenceBuildInfoDirs) {
      const key = path.basename(referenceBuildInfoDir);

      if (buildInfoDictionary[key] !== undefined) {
        throw new Error(`Reference build info directory short name '${key}' is not unique.`);
      }

      const referenceBuildInfoFiles = await getBuildInfoFiles(referenceBuildInfoDir);
      buildInfoDictionary[key] = validateBuildInfoContracts(referenceBuildInfoFiles);
    }
  }

  const specifiedContracts = findSpecifiedContracts(buildInfoDictionary, allOpts, contract, reference);

  const contractReports = getContractReports(buildInfoDictionary, allOpts, specifiedContracts, exclude);
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
