import { UpgradeableContractReport } from './contract-report';
import { Report } from '../../standalone';

export class ProjectReport implements Report {
  constructor(readonly upgradeableContractReports: UpgradeableContractReport[]) {}

  get ok(): boolean {
    return this.upgradeableContractReports.every(r => r.ok);
  }

  explain(color = true): string {
    if (this.numTotal === 0) {
      return 'No upgradeable contracts detected.';
    } else {
      const lines = this.upgradeableContractReports.map(r => r.explain(color));
      const numFailed = this.numTotal - this.numPassed;
      const plural = numFailed === 1 ? '' : 's';
      const status = this.ok ? 'SUCCESS' : 'FAILED';

      lines.push(
        `${status} (${this.numTotal} upgradeable contract${plural} detected, ${this.numPassed} passed, ${numFailed} failed)`,
      );
      return lines.join('\n\n');
    }
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

export function getProjectReport(upgradeableContractReports: UpgradeableContractReport[]): ProjectReport {
  return new ProjectReport(upgradeableContractReports);
}
