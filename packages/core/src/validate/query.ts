import { Version, getVersion } from '../version';
import { RunValidation, ValidationError } from './run';
import { StorageLayout } from '../storage/layout';
import { unlinkBytecode } from '../link-refs';
import { ValidationOptions, processExceptions } from './overrides';
import { ValidationErrors } from './error';

export type ValidationDataV1 = RunValidation;

export type ValidationDataV2 = RunValidation[];

export type ValidationData = ValidationDataV1 | ValidationDataV2;

export function normalizeValidationData(data: ValidationData): ValidationDataV2 {
  if (Array.isArray(data)) {
    return data;
  } else if (!('version' in data)) {
    return [data];
  } else {
    throw new Error('Unknown version or malformed validation data');
  }
}

export function assertUpgradeSafe(validations: ValidationData, version: Version, opts: ValidationOptions): void {
  const [contractName] = getContractNameAndRunValidation(validations, version);

  let errors = getErrors(validations, version);
  errors = processExceptions(contractName, errors, opts);

  if (errors.length > 0) {
    throw new ValidationErrors(contractName, errors);
  }
}

export function getContractVersion(validation: RunValidation, contractName: string): Version {
  const { version } = validation[contractName];
  if (version === undefined) {
    throw new Error(`Contract ${contractName} is abstract`);
  }
  return version;
}

export function getContractNameAndRunValidation(validations: ValidationData, version: Version): [string, RunValidation] {
  const validationLog = normalizeValidationData(validations);

  let runValidation;
  let contractName;

  for (const validation of validationLog) {
    contractName = Object.keys(validation).find(
      name => validation[name].version?.withMetadata === version.withMetadata,
    );
    if (contractName !== undefined) {
      runValidation = validation;
      break;
    }
  }

  if (contractName === undefined || runValidation === undefined) {
    throw new Error('The requested contract was not found. Make sure the source code is available for compilation');
  }

  return [contractName, runValidation];
}

export function getStorageLayout(validations: ValidationData, version: Version): StorageLayout {
  const [contractName, runValidation] = getContractNameAndRunValidation(validations, version);
  const c = runValidation[contractName];
  const layout: StorageLayout = { storage: [], types: {} };
  for (const name of [contractName].concat(c.inherit)) {
    layout.storage.unshift(...runValidation[name].layout.storage);
    Object.assign(layout.types, runValidation[name].layout.types);
  }
  return layout;
}

export function getUnlinkedBytecode(validations: ValidationData, bytecode: string): string {
  const validationLog = Array.isArray(validations) ? validations : [validations];

  for (const validation of validationLog) {
    const linkableContracts = Object.keys(validation).filter(name => validation[name].linkReferences.length > 0);

    for (const name of linkableContracts) {
      const { linkReferences } = validation[name];
      const unlinkedBytecode = unlinkBytecode(bytecode, linkReferences);
      const version = getVersion(unlinkedBytecode);

      if (validation[name].version?.withMetadata === version.withMetadata) {
        return unlinkedBytecode;
      }
    }
  }

  return bytecode;
}

export function getErrors(validations: ValidationData, version: Version): ValidationError[] {
  const [contractName, runValidation] = getContractNameAndRunValidation(validations, version);
  const c = runValidation[contractName];
  return c.errors
    .concat(...c.inherit.map(name => runValidation[name].errors))
    .concat(...c.libraries.map(name => runValidation[name].errors));
}

export function isUpgradeSafe(validations: ValidationData, version: Version): boolean {
  return getErrors(validations, version).length == 0;
}
