import { Version, getVersion } from '../version';
import { ValidationRunData, ValidationError } from './run';
import { StorageLayout } from '../storage/layout';
import { unlinkBytecode } from '../link-refs';
import { ValidationOptions, processExceptions } from './overrides';
import { ValidationErrors } from './error';
import { ValidationData, normalizeValidationData } from './data';

export function assertUpgradeSafe(data: ValidationData, version: Version, opts: ValidationOptions): void {
  const dataV3 = normalizeValidationData(data);
  const [contractName] = getContractNameAndRunValidation(dataV3, version);

  let errors = getErrors(dataV3, version);
  errors = processExceptions(contractName, errors, opts);

  if (errors.length > 0) {
    throw new ValidationErrors(contractName, errors);
  }
}

export function getContractVersion(runData: ValidationRunData, contractName: string): Version {
  const { version } = runData[contractName];
  if (version === undefined) {
    throw new Error(`Contract ${contractName} is abstract`);
  }
  return version;
}

export function getContractNameAndRunValidation(data: ValidationData, version: Version): [string, ValidationRunData] {
  const dataV3 = normalizeValidationData(data);

  let runValidation;
  let contractName;

  for (const validation of dataV3.log) {
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

export function getStorageLayout(data: ValidationData, version: Version): StorageLayout {
  const dataV3 = normalizeValidationData(data);
  const [contractName, runValidation] = getContractNameAndRunValidation(dataV3, version);
  return unfoldStorageLayout(runValidation, contractName);
}

export function unfoldStorageLayout(runData: ValidationRunData, contractName: string): StorageLayout {
  const c = runData[contractName];
  const layout: StorageLayout = { storage: [], types: {} };
  for (const name of [contractName].concat(c.inherit)) {
    layout.storage.unshift(...runData[name].layout.storage);
    Object.assign(layout.types, runData[name].layout.types);
  }
  return layout;
}

export function* findVersionWithoutMetadataMatches(
  data: ValidationData,
  versionWithoutMetadata: string,
): Generator<[string, ValidationRunData]> {
  const dataV3 = normalizeValidationData(data);

  for (const validation of dataV3.log) {
    for (const contractName in validation) {
      if (validation[contractName].version?.withoutMetadata === versionWithoutMetadata) {
        yield [contractName, validation];
      }
    }
  }
}

export function getUnlinkedBytecode(data: ValidationData, bytecode: string): string {
  const dataV3 = normalizeValidationData(data);

  for (const validation of dataV3.log) {
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

export function getErrors(data: ValidationData, version: Version): ValidationError[] {
  const dataV3 = normalizeValidationData(data);
  const [contractName, runValidation] = getContractNameAndRunValidation(dataV3, version);
  const c = runValidation[contractName];

  const errors = c.errors
    .concat(...c.inherit.map(name => runValidation[name].errors))
    .concat(...c.libraries.map(name => runValidation[name].errors));

  const selfAndInheritedMethods = c.methods.concat(...c.inherit.map(name => runValidation[name].methods));

  if (!selfAndInheritedMethods.includes('upgradeTo(address)')) {
    errors.push({
      src: c.src,
      kind: 'missing-public-upgradeto',
    });
  }

  return errors;
}

export function isUpgradeSafe(data: ValidationData, version: Version): boolean {
  const dataV3 = normalizeValidationData(data);
  return getErrors(dataV3, version).length == 0;
}
