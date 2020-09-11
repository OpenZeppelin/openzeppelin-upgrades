import path from 'path';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { compare as compareVersions } from 'compare-versions';
import { ManifestData, ImplDeployment } from '../manifest';
import type { StorageItem, StorageLayout, TypeItem, TypeItemMembers, StructMember } from '../storage';

const OPEN_ZEPPELIN_FOLDER = '.openzeppelin';
const EXPORT_FILE = 'openzeppelin-cli-export.json';
const PROJECT_FILE = path.join(OPEN_ZEPPELIN_FOLDER, 'project.json');
const SUCCESS_CHECK = chalk.keyword('green')('✔') + ' ';

export async function migrateLegacyProject(): Promise<void> {
  const manifestFiles = await getManifestFiles();
  const manifestsExportData = await migrateManifestFiles(manifestFiles);

  const { compiler } = await getProjectFile();
  const exportData = {
    networks: manifestsExportData,
    compiler,
  };

  await writeJSONFile(EXPORT_FILE, exportData);
  console.log(SUCCESS_CHECK + `Migration data exported to ${EXPORT_FILE}`);
  await deleteLegacyFiles(manifestFiles);

  console.log("\nThese were your project's compiler options:");
  console.log(JSON.stringify(compiler, null, 2));
}

async function migrateManifestFiles(manifestFiles: string[]) {
  const migratableManifestFiles = manifestFiles.filter(manifest => !isDevelopmentNetwork(getNetworkName(manifest)));
  const migratableManifestsData: Record<string, LegacyManifest> = {};

  for (const migratableFile in migratableManifestFiles) {
    const network = getNetworkName(migratableFile);
    migratableManifestsData[network] = JSON.parse(await fs.readFile(migratableFile, 'utf8'));
  }

  // we run the entire data migration before writing anything to disk
  const { newManifestsData, manifestsExportData } = await migrateManifestsData(migratableManifestsData);

  for (const network in newManifestsData) {
    const newManifestData = newManifestsData[network];
    const newFilename = getNewManifestFilename(network);
    await writeJSONFile(newFilename, newManifestData);
    console.log(SUCCESS_CHECK + `Successfully migrated ${newFilename}`);
  }

  return manifestsExportData;
}

async function deleteLegacyFiles(manifestFiles: string[]): Promise<void> {
  const developmentManifests = manifestFiles.filter(manifestFile => isDevelopmentNetwork(getNetworkName(manifestFile)));

  for (const manifestFile of developmentManifests) {
    console.log(SUCCESS_CHECK + `Deleting unused development manifest ${manifestFile}`);
    await fs.unlink(manifestFile);
  }

  console.log(SUCCESS_CHECK + `Deleting ${PROJECT_FILE}`);
  await fs.unlink(PROJECT_FILE);
}

async function migrateManifestsData(manifestsData: Record<string, LegacyManifest>): Promise<MigrationOutput> {
  const manifestsExportData: Record<string, ExportData> = {};
  const newManifestsData: Record<string, ManifestData> = {};

  for (const network of Object.keys(manifestsData)) {
    const oldManifestData = manifestsData[network];
    const { manifestVersion } = oldManifestData;

    if (manifestVersion === undefined) {
      throw new Error(
        'Migration failed: manifest version too old. Bump your manifest version with the OpenZeppelin CLI.',
      );
    }

    if (compareVersions(manifestVersion, '3.0', '>=')) {
      // no need to migrate
      continue;
    }

    if (manifestVersion !== '2.2') {
      throw new Error(
        `Migration failed: expected manifest version 2.2, got ${manifestVersion} instead. Bump your manifest version with the OpenZeppelin CLI.`,
      );
    }

    newManifestsData[network] = updateManifestData(oldManifestData);
    manifestsExportData[network] = getExportData(oldManifestData);
  }

  return {
    newManifestsData,
    manifestsExportData,
  };
}

async function getManifestFiles(): Promise<string[]> {
  const files = await fs.readdir(OPEN_ZEPPELIN_FOLDER);
  return files.filter(isManifestFile).map(location => path.join(OPEN_ZEPPELIN_FOLDER, location));
}

async function getProjectFile(): Promise<LegacyProjectFile> {
  return JSON.parse(await fs.readFile(PROJECT_FILE, 'utf8'));
}

function isManifestFile(fileName: string): boolean {
  const network = getNetworkName(fileName);
  return isPublicNetwork(network) || isDevelopmentNetwork(network) || isUnknownNetwork(network);
}

function getNetworkName(fileName: string): string {
  return path.basename(fileName, '.json');
}

function isDevelopmentNetwork(network: string): boolean {
  // 31337      => buidler evm
  // 13+ digits => ganache also uses timestamps
  return /^dev-(31337|\d{13,})$/.test(network);
}

function isUnknownNetwork(network: string): boolean {
  return !isDevelopmentNetwork(network) && /^dev-\d+$/.test(network);
}

function isPublicNetwork(network: string): boolean {
  return ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli'].includes(network);
}

function getNewManifestFilename(oldName: string): string {
  return isUnknownNetwork(oldName) ? oldName.replace('dev', 'unknown') : oldName;
}

async function writeJSONFile(location: string, data: unknown): Promise<void> {
  await fs.writeFile(location, JSON.stringify(data, null, 2));
}

function getExportData(oldManifestData: LegacyManifest): ExportData {
  // we flexibilize the typing to allow required fields deletion
  const manifestsExportData: Partial<LegacyManifest> = oldManifestData;
  delete manifestsExportData.proxyAdmin;
  delete manifestsExportData.contracts;
  delete manifestsExportData.solidityLibs;
  return manifestsExportData as ExportData;
}

function updateManifestData(oldManifestData: LegacyManifest): ManifestData {
  const proxyAdmin = oldManifestData.proxyAdmin.address;

  if (proxyAdmin === undefined) {
    throw new Error('Legacy manifest does not have admin address');
  }

  if (Object.keys(oldManifestData.solidityLibs).length > 0) {
    throw new Error('Legacy manifest links to external libraries which are not yet supported');
  }

  return {
    manifestVersion: '3.1',
    impls: transformImplementations(oldManifestData.contracts),
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

function transformType(typeKind: TypeKind, oldType: LegacyType): TypeItem {
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
        label: oldType.label,
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
  const name = stripContractName(getArgument(typeName));
  return `t_struct(${name})_storage`;
}

function transformEnumTypeName(typeName: string): string {
  const name = stripContractName(getArgument(typeName));
  return `t_enum(${name})`;
}

function transformMappingTypeName(typeName: string): string {
  const valueType = transformTypeName(getArgument(typeName));
  return `t_mapping(unknown,${valueType})`;
}

function transformDynArrayTypeName(typeName: string): string {
  const valueType = transformTypeName(getArgument(typeName));
  return `t_array(${valueType})dyn_storage`;
}

function transformStaticArrayTypeName(typeName: string): string {
  // here we assume the regex has been already validated
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const size = typeName.match(/:(\d+)/)![1];
  const valueType = transformTypeName(getArgument(typeName));
  return `t_array(${valueType})${size}_storage`;
}

function getArgument(typeName: string): string {
  // here we assume the regex has been already validated
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return typeName.match(/<(.+)>/)![1];
}

function stripContractName(s: string): string {
  const match = s.match(/(.+)\.(.+)/);
  // input might not contain a contract name, so we fallback to it
  return match ? match[2] : s;
}

function getTypeKind(typeName: string): TypeKind {
  if (/^t_struct<.+>/.test(typeName)) {
    return 'Struct';
  } else if (/^t_enum<.+>/.test(typeName)) {
    return 'Enum';
  } else if (/^t_mapping<.+>/.test(typeName)) {
    return 'Mapping';
  } else if (/^t_array:dyn<.+>/.test(typeName)) {
    return 'DynArray';
  } else if (/^t_array:\d+<.+>/.test(typeName)) {
    return 'StaticArray';
  } else {
    return 'Elementary';
  }
}

type TypeKind = 'Elementary' | 'Mapping' | 'Struct' | 'Enum' | 'DynArray' | 'StaticArray';

interface MigrationOutput {
  newManifestsData: Record<string, ManifestData>;
  manifestsExportData: Record<string, ExportData>;
}

interface AddressWrapper {
  address?: string;
}

interface ExportData {
  proxies: { [contractName: string]: LegacyProxy[] };
  manifestVersion?: string;
  zosversion?: string;
  proxyFactory: AddressWrapper;
  app: AddressWrapper;
  package: AddressWrapper;
  provider: AddressWrapper;
  version: string;
  frozen: boolean;
  dependencies: { [dependencyName: string]: DependencyInterface };
}

interface LegacyManifest extends ExportData {
  contracts: { [name: string]: LegacyContract };
  solidityLibs: { [name: string]: LegacySolidityLib };
  proxyAdmin: AddressWrapper;
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
  members?: TypeItemMembers;
}

interface LegacyStorageItem extends StorageItem {
  path: string;
  astId: number;
}

interface ConfigFileCompilerOptions {
  manager: string;
  solcVersion: string;
  contractsDir: string;
  artifactsDir: string;
  compilerSettings: {
    evmVersion: string;
    optimizer: {
      enabled: boolean;
      runs?: string;
    };
  };
  typechain: {
    enabled: boolean;
    outDir?: string;
    target?: string;
  };
}

interface LegacyProjectFile {
  name: string;
  version: string;
  manifestVersion?: string;
  zosversion?: string;
  dependencies: { [name: string]: string };
  contracts: string[];
  publish: boolean;
  compiler: Partial<ConfigFileCompilerOptions>;
  telemetryOptIn?: boolean;
}

type LegacyContracts = Record<string, LegacyContract>;
type LegacyTypes = Record<string, LegacyType>;
