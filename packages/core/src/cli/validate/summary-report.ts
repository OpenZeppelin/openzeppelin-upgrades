import chalk from 'chalk';
import { UpgradeableContractReport } from './contract-report';
import { Report } from '../../standalone';

export class SummaryReport implements Report {
  constructor(readonly upgradeableContractReports: UpgradeableContractReport[]) {}

  get ok(): boolean {
    return this.upgradeableContractReports.every(r => r.ok);
  }

  explain(color = true): string {
    const lines: string[] = [];
    for (const r of this.upgradeableContractReports) {
      const explain = r.explain(color);
      if (explain !== '') {
        lines.push(explain);
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
      if (report.numTotal === 0) {
        console.log('\nNo upgradeable contracts detected.');
      } else {
        console.log('\nUpgrade safety checks completed successfully.');
      }
    } else {
      console.error(chalk.bold('\n=========================================================='));
      console.error(chalk.bold('\nUpgrade safety checks completed with the following errors:'));
      console.error(`\n${report.explain()}`);
    }
  }
  return report;
}
