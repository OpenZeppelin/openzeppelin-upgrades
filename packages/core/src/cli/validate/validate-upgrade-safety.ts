import { ValidationOptions } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { getContractReports } from './contract-report';
import { findContract } from './find-contract';
import { ProjectReport, getProjectReport } from './project-report';
import { SourceContract, validateBuildInfoContracts } from './validations';

/**
 * Validation options for upgrade safety checks.
 */
export type ValidateUpgradeSafetyOptions = Omit<ValidationOptions, 'kind'>;

export type SpecifiedContracts = {
  contract: SourceContract;
  reference?: SourceContract;
};

/**
 * Validates the upgrade safety of all contracts in the build info dir's build info files.
 * Only contracts that are detected as upgradeable will be validated.
 *
 * @param buildInfoDir Absolute path of build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @param contract The name or fully qualified name of the contract to validate. If not specified, all upgradeable contracts in the build info directory will be validated.
 * @param reference The name or fully qualified name of the reference contract to use for storage layout comparisons. Can only be used along with `contract`. If not specified, uses the `@custom:oz-upgrades-from` annotation in the contract that is being validated.
 * @param opts Validation options, or undefined to use the default validation options.
 * @returns The project report.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  contract?: string,
  reference?: string,
  opts: ValidateUpgradeSafetyOptions = {},
): Promise<ProjectReport> {
  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const sourceContracts = validateBuildInfoContracts(buildInfoFiles);

  const specifiedContracts = findSpecifiedContracts(sourceContracts, contract, reference);

  const contractReports = getContractReports(sourceContracts, opts, specifiedContracts);
  return getProjectReport(contractReports);
}

function findSpecifiedContracts(
  sourceContracts: SourceContract[],
  contractName?: string,
  referenceName?: string,
): SpecifiedContracts | undefined {
  if (contractName !== undefined) {
    return {
      contract: findContract(contractName, undefined, sourceContracts),
      reference: referenceName !== undefined ? findContract(referenceName, undefined, sourceContracts) : undefined,
    };
  } else if (referenceName !== undefined) {
    throw new Error(`The reference option can only be specified when the contract option is also specified.`);
  } else {
    return undefined;
  }
}
