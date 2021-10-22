import { SolcOutput, SolcInput } from './solc-api';
import { solcInputOutputDecoder } from './src-decoder';
import {
  getContractVersion,
  getErrors,
  getStorageLayout,
  UpgradeableContractErrorReport,
  validate,
  ValidationOptions,
  withValidationDefaults,
} from './validate';
import { getStorageUpgradeReport, StorageLayout } from './storage';
import { Version } from './version';
import { ValidationError } from './validate/run';

export interface Report {
  ok: boolean;
  explain(color?: boolean): string;
}

export class UpgradeableContract {
  readonly version: Version;
  readonly errors: ValidationError[];
  readonly layout: StorageLayout;

  constructor(readonly name: string, solcInput: SolcInput, solcOutput: SolcOutput, opts: ValidationOptions = {}) {
    const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
    const validation = validate(solcOutput, decodeSrc);
    this.version = getContractVersion(validation, name);
    this.errors = getErrors(validation, this.version, opts);
    this.layout = getStorageLayout(validation, this.version);
  }

  getErrorReport() {
    return new UpgradeableContractErrorReport(this.errors);
  }

  getStorageUpgradeReport(newVersion: UpgradeableContract, opts: ValidationOptions = {}) {
    return getStorageUpgradeReport(this.layout, newVersion.layout, withValidationDefaults(opts));
  }
}
