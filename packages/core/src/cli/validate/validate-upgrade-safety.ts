import { ValidationOptions } from '../..';

import { getBuildInfoFiles } from './build-info-file';
import { SummaryReport, getSummaryReport } from './summary-report';
import { validateBuildInfoContracts } from './validations';

/**
 * Report options.
 */
export interface ReportOptions {
  /**
   * Whether to skip logging the summary report before returning it.
   */
  suppressSummary?: boolean;
}

/**
 * Validation options for upgrade safety checks.
 */
export type ValidateUpgradeSafetyOptions = Omit<ValidationOptions, 'kind'>;

/**
 * Validates the upgrade safety of all contracts in the given build info files. Only contracts that are detected as upgradeable will be validated.
 *
 * @param buildInfoFilePaths Absolute paths of build info files with Solidity compiler input and output.
 * @param reportOpts Report options, or undefined to use the default report options.
 * @param opts Validation options, or undefined to use the default validation options.
 * @returns The validation result.
 */
export function validateUpgradeSafety(
  buildInfoFilePaths: string[],
  reportOpts: ReportOptions = {},
  opts: ValidateUpgradeSafetyOptions = {},
): SummaryReport {
  const fullReportOpts = withReportDefaults(reportOpts);

  const buildInfoFiles = getBuildInfoFiles(buildInfoFilePaths);
  const reports = validateBuildInfoContracts(buildInfoFiles, opts);

  return getSummaryReport(reports, fullReportOpts.suppressSummary);
}

export function withReportDefaults(cmdOpts: ReportOptions): Required<ReportOptions> {
  return {
    suppressSummary: cmdOpts.suppressSummary ?? false,
  };
}
