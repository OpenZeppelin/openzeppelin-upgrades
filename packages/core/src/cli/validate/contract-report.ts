import chalk from 'chalk';
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

/**
 * Report for a contract that failed upgrade safety checks.
 */
export interface UpgradeableContractReport {
  /**
   * The fully qualified name of the contract.
   */
  contract: string;

  /**
   * The fully qualified name of the contract that was used as the reference for storage layout comparison.
   */
  reference?: string;

  /**
   * A report of the standalone upgrade safety checks, including any errors found in the contract if any.
   */
  standaloneReport: Report;

  /**
   * A report of the storage layout comparison, including any errors found if any. Undefined if there is no reference.
   */
  storageLayoutReport?: Report;
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
  const standaloneErrors = reportStandaloneErrors(contract.validationData, version, opts, contract.fullyQualifiedName);

  let reference: string | undefined;
  let storageLayoutErrors: Report | undefined;

  if (opts.unsafeSkipStorageCheck !== true && referenceContract !== undefined) {
    const layout = getStorageLayout(contract.validationData, version);

    const referenceVersion = getContractVersion(referenceContract.validationData, referenceContract.name);
    const referenceLayout = getStorageLayout(referenceContract.validationData, referenceVersion);

    reference = referenceContract.fullyQualifiedName;
    storageLayoutErrors = reportStorageLayoutErrors(
      referenceLayout,
      layout,
      withValidationDefaults(opts),
      referenceContract.fullyQualifiedName,
      contract.fullyQualifiedName,
    );
  }

  if (standaloneErrors.ok) {
    if (storageLayoutErrors?.ok) {
      console.log('Passed: from ' + reference + ' to ' + contract.fullyQualifiedName);
    } else {
      console.log('Passed: ' + contract.fullyQualifiedName);
    }
  }

  return {
    contract: contract.fullyQualifiedName,
    reference,
    standaloneReport: standaloneErrors,
    storageLayoutReport: storageLayoutErrors,
  }
}

function reportStandaloneErrors(data: ValidationData, version: Version, opts: ValidationOptions, name: string): Report {
  const errors = getErrors(data, version, opts);
  const report = new UpgradeableContractErrorReport(errors);
  if (!report.ok) {
    console.error(chalk.red(chalk.bold(`Failed: ${name}`)));
    console.error(report.explain());
  }
  return report;
}

function reportStorageLayoutErrors(
  referenceLayout: StorageLayout,
  layout: StorageLayout,
  opts: ValidationOptions,
  referenceName: string,
  name: string,
): Report {
  const report = getStorageUpgradeReport(referenceLayout, layout, withValidationDefaults(opts));
  if (!report.ok) {
    console.error(chalk.red(chalk.bold(`Failed: from ${referenceName} to ${name}`)));
    console.error(report.explain());
  }
  return report;
}
