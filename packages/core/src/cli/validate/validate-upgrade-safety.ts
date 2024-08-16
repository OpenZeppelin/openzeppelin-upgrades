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
 * @param referenceBuildInfoDirs Paths of reference build info directories, which can be referred to in the `reference` option
 *   or in the `@custom:oz-upgrades-from` annotation using prefix `<directoryName>:` before the contract name or fully qualified name.
 *   Each directory (including the main build info directory) must have a unique name.
* @returns The project report.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  contract?: string,
  reference?: string,
  opts: ValidateUpgradeSafetyOptions = {},
  referenceBuildInfoDirs?: string[],
): Promise<ProjectReport> {
  const allOpts = withCliDefaults(opts);

  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const sourceContracts = validateBuildInfoContracts(buildInfoFiles);

  const dictionary: ReferenceBuildInfoDictionary = {};
  if (referenceBuildInfoDirs !== undefined) {
    for (const referenceBuildInfoDir of referenceBuildInfoDirs) {
      if (dictionary[referenceBuildInfoDir] !== undefined) {
        throw new Error(`Build info directory names must be unique. Found duplicate name: ${referenceBuildInfoDir}`);
      }

      const referenceBuildInfoFiles = await getBuildInfoFiles(referenceBuildInfoDir);
      dictionary[referenceBuildInfoDir] = validateBuildInfoContracts(referenceBuildInfoFiles);
    }
  }

  const specifiedContracts = findSpecifiedContracts(sourceContracts, allOpts, contract, reference, dictionary);

  const contractReports = getContractReports(sourceContracts, allOpts, specifiedContracts);
  return getProjectReport(contractReports, specifiedContracts !== undefined);
}

export interface ReferenceBuildInfoDictionary {
  [buildInfoDirName: string]: SourceContract[];
}

export function findSpecifiedContracts(
  sourceContracts: SourceContract[],
  opts: Required<ValidateUpgradeSafetyOptions>,
  contractName?: string,
  referenceName?: string,
  dictionary?: ReferenceBuildInfoDictionary,
): SpecifiedContracts | undefined {
  if (contractName !== undefined) {
    return {
      contract: findContract(contractName, undefined, sourceContracts),
      reference: referenceName !== undefined ? findContract(referenceName, undefined, sourceContracts, dictionary) : undefined,
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
