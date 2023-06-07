import { ValidationOptions } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { SummaryReport, getSummaryReport } from './summary-report';
import { validateBuildInfoContracts } from './validations';

/**
 * Report options.
 */
export interface ReportOptions {
  /**
   * Whether to skip logging the summary report to the console before returning it.
   */
  suppressSummary?: boolean;
}

/**
 * Validation options for upgrade safety checks.
 */
export type ValidateUpgradeSafetyOptions = Omit<ValidationOptions, 'kind'>;

/**
 * Validates the upgrade safety of all contracts in the build info dir's build info files.
 * Only contracts that are detected as upgradeable will be validated.
 *
 * @param buildInfoDir Absolute path of build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @param reportOpts Report options, or undefined to use the default report options.
 * @param opts Validation options, or undefined to use the default validation options.
 * @returns The validation result.
 */
export async function validateUpgradeSafety(
  buildInfoDir?: string,
  reportOpts: ReportOptions = {},
  opts: ValidateUpgradeSafetyOptions = {},
): Promise<SummaryReport> {
  const fullReportOpts = withReportDefaults(reportOpts);

  const buildInfoFiles = await getBuildInfoFiles(buildInfoDir);
  const reports = validateBuildInfoContracts(buildInfoFiles, opts);

  return getSummaryReport(reports, fullReportOpts.suppressSummary);
}

export function withReportDefaults(cmdOpts: ReportOptions): Required<ReportOptions> {
  return {
    suppressSummary: cmdOpts.suppressSummary ?? false,
  };
}
