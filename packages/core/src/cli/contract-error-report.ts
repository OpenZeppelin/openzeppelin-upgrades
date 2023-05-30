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
} from '..';
import { Report } from '../standalone';

import { getUpgradeabilityAssessment } from './upgradeability-assessment';
import { SourceContract } from './validations';

/**
 * Error report for a contract that failed upgrade safety checks.
 */
export interface ContractErrorReport {
  /**
   * The fully qualified name of the contract.
   */
  contract: string;

  /**
   * If there are storage layout errors, this is the fully qualified name of the contract that was used as the reference.
   */
  reference?: string;

  /**
   * If standalone upgrade safety checks failed, this will contain an Error object where the message describes all of the errors found in the contract.
   */
  standaloneErrors?: Report;

  /**
   * If storage layout comparisons failed when compared to the reference contract, this will contain an Error object where the message describes all of the errors found in the storage layout comparison.
   */
  storageLayoutErrors?: Report;
}

/**
 * Gets error reports for contracts that failed upgrade safety checks.
 *
 * @param sourceContracts The source contracts to check, which must include all contracts that are referenced by the given contracts. Can also include non-upgradeable contracts, which will be ignored.
 * @param opts The validation options.
 * @returns Error reports for contracts that failed upgrade safety checks.
 */
export function getContractErrorReports(sourceContracts: SourceContract[], opts: ValidateUpgradeSafetyOptions) {
  const errorReports: ContractErrorReport[] = [];
  for (const sourceContract of sourceContracts) {
    const upgradeabilityAssessment = getUpgradeabilityAssessment(sourceContract, sourceContracts);
    if (upgradeabilityAssessment.upgradeable) {
      const reference = upgradeabilityAssessment.referenceContract;
      const uups = upgradeabilityAssessment.uups;
      const kind = uups ? 'uups' : 'transparent';

      const report = getContractErrorReport(sourceContract, reference, { ...opts, kind: kind });
      if (report !== undefined && (report.standaloneErrors !== undefined || report.storageLayoutErrors !== undefined)) {
        errorReports.push(report);
      }
    }
  }
  return errorReports;
}

function getContractErrorReport(
  contract: SourceContract,
  referenceContract: SourceContract | undefined,
  opts: ValidationOptions,
): ContractErrorReport | undefined {
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

  if (opts.unsafeSkipStorageCheck !== true && referenceContract !== undefined) {
    const layout = getStorageLayout(contract.validationData, version);

    const referenceVersion = getContractVersion(referenceContract.validationData, referenceContract.name);
    const referenceLayout = getStorageLayout(referenceContract.validationData, referenceVersion);

    const storageLayoutErrors = reportStorageLayoutErrors(
      referenceLayout,
      layout,
      withValidationDefaults(opts),
      referenceContract.fullyQualifiedName,
      contract.fullyQualifiedName,
    );

    if (!standaloneErrors.ok || !storageLayoutErrors.ok) {
      return {
        contract: contract.fullyQualifiedName,
        reference: referenceContract.fullyQualifiedName,
        standaloneErrors: standaloneErrors,
        storageLayoutErrors: storageLayoutErrors,
      };
    } else {
      console.log('Passed: from ' + referenceContract.fullyQualifiedName + ' to ' + contract.fullyQualifiedName);
    }
  } else {
    if (!standaloneErrors.ok) {
      return {
        contract: contract.fullyQualifiedName,
        standaloneErrors: standaloneErrors,
      };
    } else {
      console.log('Passed: ' + contract.fullyQualifiedName);
    }
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
