import _chalk from 'chalk';
import debug from '../../utils/debug';
import {
  getContractVersion,
  getStorageLayout,
  ValidationOptions,
  withValidationDefaults,
  Version,
  ValidationData,
  ValidateUpgradeSafetyOptions,
  getErrors,
  UpgradeableContractErrorReport,
  getStorageUpgradeReport,
} from '../..';
import { Report } from '../../standalone';
import { getUpgradeabilityAssessment } from './upgradeability-assessment';
import { SourceContract } from './validations';
import { LayoutCompatibilityReport } from '../../storage/report';

/**
 * Report for an upgradeable contract.
 * Contains the standalone report, and if there is a reference contract, the reference contract name and storage layout report.
 */
export class UpgradeableContractReport implements Report {
  constructor(
    readonly contract: string,
    readonly reference: string | undefined,
    readonly standaloneReport: UpgradeableContractErrorReport,
    readonly storageLayoutReport: LayoutCompatibilityReport | undefined,
  ) {}

  get ok(): boolean {
    return this.standaloneReport.ok && (this.storageLayoutReport === undefined || this.storageLayoutReport.ok);
  }

  explain(color = true): string {
    if (this.ok) {
      return '';
    } else {
      const result: string[] = [];
      if (this.reference === undefined) {
        result.push(`- ${this.contract}`);
      } else {
        result.push(`- ${this.contract} (upgrades from ${this.reference})`);
      }
      result.push(this.explainChildren(4, color));
      return result.join('\n\n');
    }
  }

  log(): void {
    if (this.ok) {
      if (this.reference === undefined) {
        console.log(` ${_chalk.green('✔')}  ${this.contract}`);
      } else {
        console.log(` ${_chalk.green('✔')}  ${this.contract} (upgrades from ${this.reference})`);
      }
    } else {
      if (this.reference === undefined) {
        console.log(` ${_chalk.red('✘')}  ${this.contract}`);
      } else {
        console.log(` ${_chalk.red('✘')}  ${this.contract} (upgrades from ${this.reference})`);
      }
      console.log(`\n${this.explainChildren(6)}\n`);
    }
  }

  private explainChildren(indentSpaces: number, color = true): string {
    const result: string[] = [];
    if (!this.standaloneReport.ok) {
      result.push(this.standaloneReport.explain(color));
    }
    if (this.storageLayoutReport !== undefined && !this.storageLayoutReport.ok) {
      result.push(this.storageLayoutReport.explain(color));
    }
    return this.indent(result.join('\n\n'), indentSpaces);
  }

  private indent(str: string, numSpaces: number): string {
    const spaces = ' '.repeat(numSpaces);
    return str.replace(/^/gm, spaces);
  }
}

/**
 * Gets upgradeble contract reports for the upgradeable contracts in the given set of source contracts.
 * Only contracts that are detected as upgradeable will be included in the reports.
 * Reports include upgradeable contracts regardless of whether they pass or fail upgrade safety checks.
 *
 * @param sourceContracts The source contracts to check, which must include all contracts that are referenced by the given contracts. Can also include non-upgradeable contracts, which will be ignored.
 * @param opts The validation options.
 * @returns The upgradeable contract reports.
 */
export function getContractReports(sourceContracts: SourceContract[], opts: ValidateUpgradeSafetyOptions) {
  const upgradeableContractReports: UpgradeableContractReport[] = [];
  for (const sourceContract of sourceContracts) {
    const upgradeabilityAssessment = getUpgradeabilityAssessment(sourceContract, sourceContracts);
    if (upgradeabilityAssessment.upgradeable) {
      const reference = upgradeabilityAssessment.referenceContract;
      const uups = upgradeabilityAssessment.uups;
      const kind = uups ? 'uups' : 'transparent';

      const report = getUpgradeableContractReport(sourceContract, reference, { ...opts, kind: kind });
      if (report !== undefined) {
        report.log(); // TODO call this in parent function
        upgradeableContractReports.push(report);
      }
    }
  }
  return upgradeableContractReports;
}

function getUpgradeableContractReport(
  contract: SourceContract,
  referenceContract: SourceContract | undefined,
  opts: ValidationOptions,
): UpgradeableContractReport | undefined {
  let version;
  try {
    version = getContractVersion(contract.validationData, contract.name);
  } catch (e: any) {
    if (e.message.endsWith('is abstract')) {
      // Skip abstract upgradeable contracts - they will be validated as part of their caller contracts
      // for the functions that are in use.
      return undefined;
    } else {
      throw e;
    }
  }

  debug('Checking: ' + contract.fullyQualifiedName);
  const standaloneReport = getStandaloneReport(contract.validationData, version, opts);

  let reference: string | undefined;
  let storageLayoutReport: LayoutCompatibilityReport | undefined;

  if (opts.unsafeSkipStorageCheck !== true && referenceContract !== undefined) {
    const layout = getStorageLayout(contract.validationData, version);

    const referenceVersion = getContractVersion(referenceContract.validationData, referenceContract.name);
    const referenceLayout = getStorageLayout(referenceContract.validationData, referenceVersion);

    reference = referenceContract.fullyQualifiedName;
    storageLayoutReport = getStorageUpgradeReport(referenceLayout, layout, withValidationDefaults(opts));
  }

  return new UpgradeableContractReport(contract.fullyQualifiedName, reference, standaloneReport, storageLayoutReport);
}

function getStandaloneReport(
  data: ValidationData,
  version: Version,
  opts: ValidationOptions,
): UpgradeableContractErrorReport {
  const errors = getErrors(data, version, withValidationDefaults(opts));
  return new UpgradeableContractErrorReport(errors);
}
