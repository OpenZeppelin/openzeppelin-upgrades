import _chalk from 'chalk';
import { UpgradeableContractReport } from './contract-report';
import { Report } from '../../standalone';

export class SummaryReport implements Report {
  constructor(readonly upgradeableContractReports: UpgradeableContractReport[]) {}

  get ok(): boolean {
    return this.upgradeableContractReports.every(r => r.ok);
  }

  explain(color = true): string {
    const chalk = new _chalk.Instance({ level: color && _chalk.supportsColor ? _chalk.supportsColor.level : 0 });

    const lines: string[] = [];

    for (const r of this.upgradeableContractReports) {
      if (!r.standaloneReport.ok) {
        lines.push(chalk.bold(`- ${r.contract}:`));
        lines.push(r.standaloneReport.explain(color));
      }
      if (r.storageLayoutReport !== undefined && !r.storageLayoutReport.ok) {
        if (r.reference === undefined) {
          throw new Error('Broken invariant: Storage layout errors reported without a reference contract');
        }
        lines.push(chalk.bold(`- ${r.reference} to ${r.contract}:`));
        lines.push(r.storageLayoutReport.explain(color));
      }
    }
    return lines.join('\n\n');
  }

  /**
   * Number of contracts that passed upgrade safety checks.
   */
  get numPassed(): number {
    return this.upgradeableContractReports.filter(r => r.ok).length;
  }

  /**
   * Total number of upgradeable contracts detected.
   */
  get numTotal(): number {
    return this.upgradeableContractReports.length;
  }
}

export function getSummaryReport(
  upgradeableContractReports: UpgradeableContractReport[],
  suppressSummary: boolean,
): SummaryReport {
  const report = new SummaryReport(upgradeableContractReports);
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
