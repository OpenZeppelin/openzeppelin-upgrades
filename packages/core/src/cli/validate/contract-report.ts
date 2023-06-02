import _chalk from 'chalk';
import {
  getContractVersion,
  getStorageLayout,
  ValidationOptions,
  withValidationDefaults,
  StorageLayout,
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
    const chalk = new _chalk.Instance({ level: color && _chalk.supportsColor ? _chalk.supportsColor.level : 0 });

    const lines: string[] = [];
    if (!this.standaloneReport.ok) {
      lines.push(chalk.bold(`- ${this.contract}:`));
      lines.push(this.standaloneReport.explain(color));
    }
    if (this.storageLayoutReport !== undefined && !this.storageLayoutReport.ok) {
      if (this.reference === undefined) {
        throw new Error('Broken invariant: Storage layout errors reported without a reference contract');
      }
      lines.push(chalk.bold(`- ${this.reference} to ${this.contract}:`));
      lines.push(this.storageLayoutReport.explain(color));
    }
    return lines.join('\n\n');
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

  console.log('Checking: ' + contract.fullyQualifiedName);
  const standaloneReport = reportStandalone(contract.validationData, version, opts, contract.fullyQualifiedName);

  let reference: string | undefined;
  let storageLayoutReport: LayoutCompatibilityReport | undefined;

  if (opts.unsafeSkipStorageCheck !== true && referenceContract !== undefined) {
    const layout = getStorageLayout(contract.validationData, version);

    const referenceVersion = getContractVersion(referenceContract.validationData, referenceContract.name);
    const referenceLayout = getStorageLayout(referenceContract.validationData, referenceVersion);

    reference = referenceContract.fullyQualifiedName;
    storageLayoutReport = reportStorageLayout(
      referenceLayout,
      layout,
      withValidationDefaults(opts),
      referenceContract.fullyQualifiedName,
      contract.fullyQualifiedName,
    );
  }

  if (standaloneReport.ok) {
    if (storageLayoutReport?.ok) {
      console.log('Passed: from ' + reference + ' to ' + contract.fullyQualifiedName);
    } else {
      console.log('Passed: ' + contract.fullyQualifiedName);
    }
  }

  return new UpgradeableContractReport(contract.fullyQualifiedName, reference, standaloneReport, storageLayoutReport);
}

function reportStandalone(
  data: ValidationData,
  version: Version,
  opts: ValidationOptions,
  name: string,
): UpgradeableContractErrorReport {
  const errors = getErrors(data, version, opts);
  const report = new UpgradeableContractErrorReport(errors);
  if (!report.ok) {
    console.error(_chalk.red(_chalk.bold(`Failed: ${name}`)));
    console.error(report.explain());
  }
  return report;
}

function reportStorageLayout(
  referenceLayout: StorageLayout,
  layout: StorageLayout,
  opts: ValidationOptions,
  referenceName: string,
  name: string,
): LayoutCompatibilityReport {
  const report = getStorageUpgradeReport(referenceLayout, layout, withValidationDefaults(opts));
  if (!report.ok) {
    console.error(_chalk.red(_chalk.bold(`Failed: from ${referenceName} to ${name}`)));
    console.error(report.explain());
  }
  return report;
}
