import _chalk from 'chalk';
import debug from '../../utils/debug';
import {
  getContractVersion,
  getStorageLayout,
  ValidationOptions,
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
import { indent } from '../../utils/indent';
import { BuildInfoDictionary, SpecifiedContracts } from './validate-upgrade-safety';
import { minimatch } from 'minimatch';
import { ValidateCommandError } from './error';
import { defaultExclude } from './default-exclude';

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
  ) {
    if (reference === contract) {
      throw new ValidateCommandError(
        `The contract ${contract} must not use itself as a reference for storage layout comparisons.`,
        () => `\
If this is the first version of your contract, do not specify a reference.
If this is a subsequent version, keep the previous version of the contract in another file and specify that as the reference, or specify a reference from another build info directory containing the previous version. If you do not have the previous version available, you can skip the storage layout check using the \`unsafeSkipStorageCheck\` option, which is a dangerous option meant to be used as a last resort.`,
      );
    }
  }

  get ok(): boolean {
    return this.standaloneReport.ok && (this.storageLayoutReport === undefined || this.storageLayoutReport.ok);
  }

  /**
   * Explain any errors in the report.
   */
  explain(color = true): string {
    const result: string[] = [];
    const chalk = new _chalk.Instance({ level: color && _chalk.supportsColor ? _chalk.supportsColor.level : 0 });
    const icon = this.ok ? chalk.green('✔') : chalk.red('✘');
    if (this.reference === undefined) {
      result.push(` ${icon}  ${this.contract}`);
    } else {
      result.push(` ${icon}  ${this.contract} (upgrades from ${this.reference})`);
    }
    if (!this.standaloneReport.ok) {
      result.push(indent(this.standaloneReport.explain(color), 6));
    }
    if (this.storageLayoutReport !== undefined && !this.storageLayoutReport.ok) {
      result.push(indent(this.storageLayoutReport.explain(color), 6));
    }
    return result.join('\n\n');
  }
}

/**
 * Gets upgradeble contract reports for the upgradeable contracts in the set of source contracts at dictionary key ''.
 * Reference contracts can come from source contracts at the corresponding dictionary key.
 * Only contracts that are detected as upgradeable will be included in the reports.
 * Reports include upgradeable contracts regardless of whether they pass or fail upgrade safety checks.
 *
 * @param buildInfoDictionary Dictionary of build info directories and the source contracts they contain.
 * @param opts The validation options.
 * @param specifiedContracts If provided, only the specified contract (upgrading from its reference contract) will be reported.
 * @param exclude Exclude validations for contracts in source file paths that match any of the given glob patterns.
 * @returns The upgradeable contract reports.
 */
export function getContractReports(
  buildInfoDictionary: BuildInfoDictionary,
  opts: Required<ValidateUpgradeSafetyOptions>,
  specifiedContracts?: SpecifiedContracts,
  exclude?: string[],
) {
  const upgradeableContractReports: UpgradeableContractReport[] = [];

  const contractsToReport: SourceContract[] =
    specifiedContracts !== undefined ? [specifiedContracts.contract] : buildInfoDictionary[''];

  for (const sourceContract of contractsToReport) {
    const upgradeabilityAssessment = getUpgradeabilityAssessment(
      sourceContract,
      buildInfoDictionary,
      specifiedContracts?.reference,
    );
    if (opts.requireReference && upgradeabilityAssessment.referenceContract === undefined) {
      throw new Error(
        `The contract ${sourceContract.fullyQualifiedName} does not specify what contract it upgrades from. Add the \`@custom:oz-upgrades-from <REFERENCE_CONTRACT>\` annotation to the contract, or include the reference contract name when running the validate command or function.`,
      );
    } else if (specifiedContracts !== undefined || upgradeabilityAssessment.upgradeable) {
      const reference = upgradeabilityAssessment.referenceContract;
      const kind = upgradeabilityAssessment.uups ? 'uups' : 'transparent';
      const report = getUpgradeableContractReport(sourceContract, reference, { ...opts, kind: kind }, exclude);
      if (report !== undefined) {
        upgradeableContractReports.push(report);
      } else if (specifiedContracts !== undefined) {
        // If there was no report for the specified contract, it was excluded or is abstract.
        const userAction =
          exclude !== undefined
            ? `Ensure the contract is not abstract and is not excluded by the exclude option.`
            : `Ensure the contract is not abstract.`;
        throw new ValidateCommandError(
          `No validation report found for contract ${specifiedContracts.contract.fullyQualifiedName}`,
          () => userAction,
        );
      }
    }
  }

  return upgradeableContractReports;
}

/**
 * Gets a report for an upgradeable contract.
 * Returns undefined if the contract is excluded or is abstract.
 */
function getUpgradeableContractReport(
  contract: SourceContract,
  referenceContract: SourceContract | undefined,
  opts: Required<ValidationOptions>,
  exclude?: string[],
): UpgradeableContractReport | undefined {
  const excludeWithDefaults = defaultExclude.concat(exclude ?? []);

  if (excludeWithDefaults.some(glob => minimatch(getPath(contract.fullyQualifiedName), glob))) {
    debug('Excluding contract: ' + contract.fullyQualifiedName);
    return undefined;
  }

  let version;
  try {
    version = getContractVersion(contract.validationData, contract.fullyQualifiedName);
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
  const standaloneReport = getStandaloneReport(contract.validationData, version, opts, excludeWithDefaults);

  let reference: string | undefined;
  let storageLayoutReport: LayoutCompatibilityReport | undefined;

  if (opts.unsafeSkipStorageCheck !== true && referenceContract !== undefined) {
    const layout = getStorageLayout(contract.validationData, version);

    const referenceVersion = getContractVersion(referenceContract.validationData, referenceContract.fullyQualifiedName);
    const referenceLayout = getStorageLayout(referenceContract.validationData, referenceVersion);

    if (referenceContract.buildInfoDirShortName !== contract.buildInfoDirShortName) {
      reference = `${referenceContract.buildInfoDirShortName}:${referenceContract.fullyQualifiedName}`;
    } else {
      reference = referenceContract.fullyQualifiedName;
    }
    storageLayoutReport = getStorageUpgradeReport(referenceLayout, layout, opts);
  }

  return new UpgradeableContractReport(contract.fullyQualifiedName, reference, standaloneReport, storageLayoutReport);
}

function getStandaloneReport(
  data: ValidationData,
  version: Version,
  opts: Required<ValidationOptions>,
  excludeWithDefaults: string[],
): UpgradeableContractErrorReport {
  const allErrors = getErrors(data, version, opts);

  const includeErrors = allErrors.filter(e => {
    const shouldExclude = excludeWithDefaults.some(glob => minimatch(getPath(e.src), glob));
    if (shouldExclude) {
      debug('Excluding error: ' + e.src);
    }
    return !shouldExclude;
  });

  return new UpgradeableContractErrorReport(includeErrors);
}

function getPath(srcOrFullyQualifiedName: string): string {
  return srcOrFullyQualifiedName.split(':')[0];
}
