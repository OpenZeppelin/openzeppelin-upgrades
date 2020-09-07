import path from 'path';
import { promises as fs } from 'fs';
import type { ManifestData, ImplDeployment } from '../manifest';
import type { StorageItem, StorageLayout, TypeItem, TypeMembers, StructMember } from '../storage';

const OPEN_ZEPPELIN_FOLDER = '.openzeppelin';
const MIGRATION_FILE_LOCATION = 'openzeppelin-cli-export.json';

export async function migrateLegacyProject(): Promise<void> {
  const oldManifests = await getManifests();
  const { newManifests, exportData } = await migrateManifestFiles(oldManifests);

  for (const manifestFile in newManifests) {
    const newManifest = newManifests[manifestFile];
    await writeJSONFile(getNewManifestLocation(manifestFile), newManifest);
  }

  await writeJSONFile(MIGRATION_FILE_LOCATION, exportData);
}

async function migrateManifestFiles(oldManifests: string[]): Promise<MigrationOutput> {
  const exportData: Record<string, unknown> = {};
  const newManifests: Record<string, ManifestData> = {};

  for (const manifestFile of oldManifests) {
    const oldManifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));

    if (oldManifest.manifestVersion === undefined) {
      throw new Error('Migration failed: manifest version too old');
    }

    const [major, minor] = oldManifest.manifestVersion.split('.');

    if (major === '3') {
      continue;
    }

    // 2.2 latest version
    if (major !== '2' || minor !== '2') {
      throw new Error(`Migration failed: expected manifest version 2.2, got ${major}.${minor} instead`);
    }

    const network = getNetworkName(manifestFile);
    exportData[network] = transformProxies(oldManifest.proxies);
    newManifests[manifestFile] = updateManifest(oldManifest);
  }

  return {
    newManifests,
    exportData,
  };
}

async function getManifests(): Promise<string[]> {
  const files = await fs.readdir(OPEN_ZEPPELIN_FOLDER);
  return files.filter(isManifestFile).map(preppendPath);
}

function preppendPath(location: string): string {
  return path.join(OPEN_ZEPPELIN_FOLDER, location);
}

function isManifestFile(fileName: string): boolean {
  const network = getNetworkName(fileName);
  return isPublicNetwork(network) || isDevelopmentNetwork(network);
}

function getNetworkName(fileName: string): string {
  return path.basename(fileName, '.json');
}

function isDevelopmentNetwork(network: string): boolean {
  return /^dev-\d+$/.test(network);
}

function isPublicNetwork(network: string): boolean {
  return ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli'].includes(network);
}

function getNewManifestLocation(oldName: string): string {
  return isDevelopmentNetwork(oldName) ? oldName.replace('dev', 'unknown') : oldName;
}

async function writeJSONFile(location: string, data: unknown): Promise<void> {
  await fs.writeFile(location, JSON.stringify(data, null, 2));
}

function transformProxies(proxies: LegacyProxies) {
  return Object.keys(proxies).map(proxyName => ({
    [path.basename(proxyName)]: proxies[proxyName].map(proxy => ({
      address: proxy.address,
      implementation: proxy.implementation,
      admin: proxy.admin,
    })),
  }));
}

function updateManifest(oldManifest: LegacyManifest): ManifestData {
  const proxyAdmin = oldManifest.proxyAdmin.address;

  if (proxyAdmin === undefined) {
    throw new Error('Legacy manifest does not have admin address');
  }

  if (Object.keys(oldManifest.solidityLibs).length > 0) {
    throw new Error('Legacy manifest links to external libraries which is not yet supported');
  }

  return {
    manifestVersion: '3.1',
    impls: transformImplementations(oldManifest.contracts),
    admin: {
      address: proxyAdmin,
    },
  };
}

function transformImplementations(contracts: LegacyContracts): Record<string, ImplDeployment> {
  const impls: Record<string, ImplDeployment> = {};
  for (const contractName in contracts) {
    const contract = contracts[contractName];
    if (contract.deployedBytecodeHash === undefined) {
      continue;
    } else {
      impls[contract.deployedBytecodeHash] = transformImplementationItem(contract);
    }
  }
  return impls;
}

function transformImplementationItem(contract: LegacyContract): ImplDeployment {
  if (contract.address === undefined) {
    throw new Error('Could not find implementation address');
  }

  return {
    address: contract.address,
    layout: transformLayout(contract),
  };
}

function transformLayout(contract: LegacyContract): StorageLayout {
  return {
    storage: contract.storage?.map(transformStorageItem) || [],
    types: transformTypes(contract.types || {}),
  };
}

function transformStorageItem(storageItem: LegacyStorageItem): StorageItem {
  return {
    contract: storageItem.contract,
    label: storageItem.label,
    type: transformTypeName(storageItem.type),
    // TODO reconstruct path and line if sourcecode is available
    src: storageItem.path,
  };
}

function transformTypes(oldTypes: LegacyTypes): Record<string, TypeItem> {
  const newTypes: Record<string, TypeItem> = {};
  for (const typeName in oldTypes) {
    newTypes[transformTypeName(typeName)] = transformType(getTypeKind(typeName), oldTypes[typeName]);
  }
  return newTypes;
}

function transformType(typeKind: string, oldType: LegacyType): TypeItem {
  switch (typeKind) {
    case 'Struct':
      return {
        label: stripContractName(oldType.label),
        members: (oldType.members as StructMember[]).map(member => ({
          label: stripContractName(member.label),
          type: transformTypeName(member.type),
        })),
      };
    case 'Enum':
      return {
        label: stripContractName(oldType.label),
        members: oldType.members,
      };
    default:
      return {
        label: stripContractName(oldType.label),
      };
  }
}

function transformTypeName(typeName: string): string {
  switch (getTypeKind(typeName)) {
    case 'Struct':
      return transformStructTypeName(typeName);
    case 'Enum':
      return transformEnumTypeName(typeName);
    case 'Mapping':
      return transformMappingTypeName(typeName);
    case 'DynArray':
      return transformDynArrayTypeName(typeName);
    case 'StaticArray':
      return transformStaticArrayTypeName(typeName);
    case 'Elementary':
      return typeName;
    default:
      throw new Error(`Unknown type: ${typeName}`);
  }
}

function transformStructTypeName(typeName: string): string {
  const valueType = stripContractName(getValueType(typeName));
  return `t_struct(${valueType})_storage`;
}

function transformEnumTypeName(typeName: string): string {
  const valueType = stripContractName(getValueType(typeName));
  return `t_enum(${valueType})`;
}

function transformMappingTypeName(typeName: string): string {
  const valueType = transformTypeName(getValueType(typeName));
  return `t_mapping(${valueType})`;
}

function transformDynArrayTypeName(typeName: string): string {
  const valueType = transformTypeName(getValueType(typeName));
  return `t_array(${valueType})dyn_storage`;
}

function transformStaticArrayTypeName(typeName: string): string {
  const size = optimisticMatch(typeName, /:(\d*)/)[1];
  const valueType = transformTypeName(getValueType(typeName));
  return `t_array(${valueType})${size}_storage`;
}

function getValueType(typeName: string): string {
  return optimisticMatch(typeName, /<(.*)>/)[1];
}

function stripContractName(s: string): string {
  return optimisticMatch(s, /(.*)\.(.*)/)[2];
}

function optimisticMatch(s: string, rg: RegExp): string[] {
  const matches = s.match(rg);
  if (matches === null) {
    return [s];
  }
  return matches;
}

function getTypeKind(typeName: string): TypeKind {
  if (/^t_struct<.*>/.test(typeName)) {
    return 'Struct';
  } else if (/^t_enum<.*>/.test(typeName)) {
    return 'Enum';
  } else if (/^t_mapping<.*>/.test(typeName)) {
    return 'Mapping';
  } else if (/^t_array:dyn<.*>/.test(typeName)) {
    return 'DynArray';
  } else if (/^t_array:\d*<.*>/.test(typeName)) {
    return 'StaticArray';
  } else {
    return 'Elementary';
  }
}

type TypeKind = 'Elementary' | 'Mapping' | 'Struct' | 'Enum' | 'DynArray' | 'StaticArray';

interface MigrationOutput {
  newManifests: Record<string, ManifestData>;
  exportData: unknown;
}

interface AddressWrapper {
  address?: string;
}

interface LegacyManifest {
  contracts: { [name: string]: LegacyContract };
  solidityLibs: { [name: string]: LegacySolidityLib };
  proxies: { [contractName: string]: LegacyProxy[] };
  manifestVersion?: string;
  zosversion?: string;
  proxyAdmin: AddressWrapper;
  proxyFactory: AddressWrapper;
  app: AddressWrapper;
  package: AddressWrapper;
  provider: AddressWrapper;
  version: string;
  frozen: boolean;
  dependencies: { [dependencyName: string]: DependencyInterface };
}

interface DependencyInterface {
  name?: string;
  package?: string;
  version?: string;
  customDeploy?: boolean;
}

interface LegacyContract {
  address?: string;
  constructorCode?: string;
  localBytecodeHash?: string;
  deployedBytecodeHash?: string;
  bodyBytecodeHash?: string;
  types?: LegacyTypes;
  storage?: LegacyStorageItem[];
  warnings?: unknown;
  [id: string]: unknown;
}

interface LegacySolidityLib {
  address: string;
  constructorCode: string;
  bodyBytecodeHash: string;
  localBytecodeHash: string;
  deployedBytecodeHash: string;
}

enum ProxyType {
  Upgradeable = 'Upgradeable',
  Minimal = 'Minimal',
  NonProxy = 'NonProxy',
}

interface LegacyProxy {
  contractName?: string;
  package?: string;
  address?: string;
  version?: string;
  implementation?: string;
  admin?: string;
  kind?: ProxyType;
  bytecodeHash?: string; // Only used for non-proxies from regulear deploys.
}

interface LegacyType {
  id: string;
  kind: string;
  label: string;
  members?: TypeMembers;
}

interface LegacyStorageItem extends StorageItem {
  path: string;
  astId: number;
}

type LegacyContracts = Record<string, LegacyContract>;
type LegacyProxies = Record<string, LegacyProxy[]>;
type LegacyTypes = Record<string, LegacyType>;
