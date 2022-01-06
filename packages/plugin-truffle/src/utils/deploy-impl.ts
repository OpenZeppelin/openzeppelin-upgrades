import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getStorageLayoutForAddress,
  ValidationOptions,
  assertNotProxy,
  getImplementationAddressFromBeacon,
  EthereumProvider,
  StorageLayout,
  ValidationRunData,
  Version,
  processProxyKind,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options, withDefaults } from './options';
import { ContractClass, getTruffleConfig } from './truffle';
import { validateArtifacts, getLinkedBytecode } from './validations';
import { wrapProvider } from './wrap-provider';

interface DeployedImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
}

interface DeployedBeaconImpl {
  impl: string;
}

interface DeployData {
  fullOpts: Required<Options>;
  validations: ValidationRunData;
  version: Version;
  provider: EthereumProvider;
  layout: StorageLayout;
}

async function getDeployData(opts: Options, Contract: ContractClass): Promise<DeployData> {
  const fullOpts = withDefaults(opts);
  const provider = wrapProvider(fullOpts.deployer.provider);
  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);
  const linkedBytecode = await getLinkedBytecode(Contract, provider);
  const encodedArgs = encodeArgs(Contract, fullOpts.constructorArgs);
  const version = getVersion(Contract.bytecode, linkedBytecode, encodedArgs);
  const layout = getStorageLayout([validations], version);
  return { fullOpts, validations, version, provider, layout };
}

export async function deployProxyImpl(
  Contract: ContractClass,
  opts: Options,
  proxyAddress?: string,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(opts, Contract);

  await processProxyKind(deployData.provider, proxyAddress, opts, deployData.validations, deployData.version);

  let currentImplAddress: string | undefined;
  if (proxyAddress !== undefined) {
    // upgrade scenario
    currentImplAddress = await getImplementationAddress(deployData.provider, proxyAddress);
  }

  return deployImpl(deployData, Contract, opts, currentImplAddress);
}

export async function deployBeaconImpl(
  Contract: ContractClass,
  opts: Options,
  beaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  const deployData = await getDeployData(opts, Contract);

  let currentImplAddress;
  if (beaconAddress !== undefined) {
    // upgrade scenario
    await assertNotProxy(deployData.provider, beaconAddress);
    currentImplAddress = await getImplementationAddressFromBeacon(deployData.provider, beaconAddress);
  }
  return deployImpl(deployData, Contract, opts, currentImplAddress);
}

function encodeArgs(Contract: ContractClass, constructorArgs: unknown[]): string {
  const fragment = (Contract as any).abi.find((entry: any) => entry.type == 'constructor');

  return (Contract as any).web3.eth.abi.encodeParameters(
    fragment?.inputs?.map((entry: any) => entry.type) ?? [],
    constructorArgs,
  );
}

async function deployImpl(
  deployData: DeployData,
  Contract: ContractClass,
  opts: Options,
  currentImplAddress?: string,
): Promise<any> {
  assertUpgradeSafe([deployData.validations], deployData.version, deployData.fullOpts);
  const layout = deployData.layout;

  if (currentImplAddress !== undefined) {
    const manifest = await Manifest.forNetwork(deployData.provider);
    const currentLayout = await getStorageLayoutForAddress(manifest, deployData.validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, deployData.layout, deployData.fullOpts);
  }

  const impl = await fetchOrDeploy(deployData.version, deployData.provider, async () => {
    const abi = (Contract as any).abi;
    const deployment = Object.assign(
      { abi },
      await deploy(deployData.fullOpts.deployer, Contract, ...deployData.fullOpts.constructorArgs),
    );
    return { ...deployment, layout };
  });

  return { impl, kind: opts.kind };
}
