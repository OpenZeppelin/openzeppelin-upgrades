import { ValidationOptions } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { SummaryReport, getSummaryReport } from './summary-report';
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
 * @returns The validation result.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  opts: ValidateUpgradeSafetyOptions = {},
): Promise<SummaryReport> {
  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const reports = validateBuildInfoContracts(buildInfoFiles, opts);

  return getSummaryReport(reports);
}
