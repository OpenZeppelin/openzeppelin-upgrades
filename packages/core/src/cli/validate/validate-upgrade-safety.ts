import { ValidationOptions } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { getContractReports } from './contract-report';
import { ProjectReport, getProjectReport } from './project-report';
import { validateBuildInfoContracts } from './validations';

/**
 * Validation options for upgrade safety checks.
 */
export type ValidateUpgradeSafetyOptions = Omit<ValidationOptions, 'kind'>;

/**
 * Validates the upgrade safety of all contracts in the build info dir's build info files.
 * Only contracts that are detected as upgradeable will be validated.
 *
 * @param buildInfoDir Absolute path of build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @param opts Validation options, or undefined to use the default validation options.
 * @returns The project report.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  opts: ValidateUpgradeSafetyOptions = {},
): Promise<ProjectReport> {
  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const sourceContracts = validateBuildInfoContracts(buildInfoFiles);
  const contractReports = getContractReports(sourceContracts, opts);
  return getProjectReport(contractReports);
}
