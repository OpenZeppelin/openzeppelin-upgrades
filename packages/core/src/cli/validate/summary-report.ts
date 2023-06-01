import _chalk from 'chalk';
import { ContractErrorReport } from './contract-error-report';
import { Report } from '../../standalone';

export class SummaryReport implements Report {
  constructor(readonly errorReports: ContractErrorReport[]) {}

  get ok(): boolean {
    return this.errorReports.length === 0;
  }

  explain(color = true): string {
    const chalk = new _chalk.Instance({ level: color && _chalk.supportsColor ? _chalk.supportsColor.level : 0 });

    const lines: string[] = [];
    for (const errorReport of this.errorReports) {
      if (errorReport.standaloneErrors !== undefined) {
        lines.push(chalk.bold(`- ${errorReport.contract}:`));
        lines.push(errorReport.standaloneErrors.explain(color));
      }
      if (errorReport.storageLayoutErrors !== undefined) {
        if (errorReport.reference === undefined) {
          throw new Error('Broken invariant: Storage layout errors reported without a reference contract');
        }
        lines.push(chalk.bold(`- ${errorReport.reference} to ${errorReport.contract}:`));
        lines.push(errorReport.storageLayoutErrors.explain(color));
      }
    }
    return lines.join('\n\n');
  }
}

export function getSummaryReport(errorReports: ContractErrorReport[], suppressSummary: boolean): SummaryReport {
  const report = new SummaryReport(errorReports);
  if (!suppressSummary) {
    if (report.ok) {
      console.log('\nUpgrade safety checks completed successfully.');
    } else {
      console.error(_chalk.bold('\n=========================================================='));
      console.error(_chalk.bold('\nUpgrade safety checks completed with the following errors:'));
      console.error(`\n${report.explain()}`);
    }
  }
  return report;
}
