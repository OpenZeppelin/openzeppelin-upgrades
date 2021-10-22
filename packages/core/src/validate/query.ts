import { Version, getVersion } from '../version';
import { ValidationRunData, ValidationError } from './run';
import { StorageLayout } from '../storage/layout';
import { unlinkBytecode } from '../link-refs';
import { ValidationOptions, processExceptions } from './overrides';
import { ValidationErrors } from './error';
import { ValidationData, normalizeValidationData } from './data';
import { ProxyDeployment } from '../manifest';

const upgradeToSignature = 'upgradeTo(address)';

export function assertUpgradeSafe(data: ValidationData, version: Version, opts: ValidationOptions): void {
  const dataV3 = normalizeValidationData(data);
  const [contractName] = getContractNameAndRunValidation(dataV3, version);

  const errors = getErrors(dataV3, version, opts);

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

export function getErrors(data: ValidationData, version: Version, opts: ValidationOptions = {}): ValidationError[] {
  const dataV3 = normalizeValidationData(data);
  const [contractName, runValidation] = getContractNameAndRunValidation(dataV3, version);
  const c = runValidation[contractName];

  const errors = getUsedContractsAndLibraries(contractName, runValidation).flatMap(name => runValidation[name].errors);

  const selfAndInheritedMethods = getAllMethods(runValidation, contractName);

  if (!selfAndInheritedMethods.includes(upgradeToSignature)) {
    errors.push({
      src: c.src,
      kind: 'missing-public-upgradeto',
    });
  }

  return processExceptions(contractName, errors, opts);
}

function getAllMethods(runValidation: ValidationRunData, contractName: string): string[] {
  const c = runValidation[contractName];
  return c.methods.concat(...c.inherit.map(name => runValidation[name].methods));
}

function getUsedContractsAndLibraries(contractName: string, runValidation: ValidationRunData) {
  const c = runValidation[contractName];
  // Add current contract and all of its parents
  const res = new Set([contractName, ...c.inherit]);
  // Add used libraries transitively until no more are found
  for (const c1 of res) {
    for (const c2 of runValidation[c1].libraries) {
      res.add(c2);
    }
  }
  return Array.from(res);
}

export function isUpgradeSafe(data: ValidationData, version: Version): boolean {
  const dataV3 = normalizeValidationData(data);
  return getErrors(dataV3, version).length == 0;
}

export function inferProxyKind(data: ValidationData, version: Version): ProxyDeployment['kind'] {
  const dataV3 = normalizeValidationData(data);
  const [contractName, runValidation] = getContractNameAndRunValidation(dataV3, version);
  const methods = getAllMethods(runValidation, contractName);
  if (methods.includes(upgradeToSignature)) {
    return 'uups';
  } else {
    return 'transparent';
  }
}
