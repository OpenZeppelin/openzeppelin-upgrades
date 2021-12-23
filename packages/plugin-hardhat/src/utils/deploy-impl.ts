import {
  assertNotProxy,
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  BeaconProxyUnsupportedError,
  fetchOrDeploy,
  getImplementationAddress,
  getImplementationAddressFromBeacon,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
  inferProxyKind,
  isBeaconProxy,
  Manifest,
  setProxyKind,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import type { ContractFactory } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deploy } from './deploy';
import { Options, withDefaults } from './options';
import { readValidations } from './validations';

interface DeployedProxyImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
}

interface DeployedBeaconImpl {
  impl: string;
}

async function getDeployData(hre: HardhatRuntimeEnvironment, ImplFactory: ContractFactory, opts: Options) {
  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const encodedArgs = ImplFactory.interface.encodeDeploy(opts.constructorArgs);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode, encodedArgs);
  const layout = getStorageLayout(validations, version);
  const fullOpts = withDefaults(opts);
  return { provider, validations, unlinkedBytecode, encodedArgs, version, layout, fullOpts };
}

export async function deployProxyImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  proxyAddress?: string,
): Promise<DeployedProxyImpl> {
  const deployData = await getDeployData(hre, ImplFactory, opts);
  await processProxyKind();

  let currentImplAddress;
  if (proxyAddress !== undefined) {
    // upgrade scenario
    currentImplAddress = await getImplementationAddress(deployData.provider, proxyAddress);
  }

  return deployImpl(deployData, ImplFactory, opts, currentImplAddress);

  async function processProxyKind() {
    if (opts.kind === undefined) {
      if (proxyAddress !== undefined && (await isBeaconProxy(deployData.provider, proxyAddress))) {
        opts.kind = 'beacon';
      } else {
        opts.kind = inferProxyKind(deployData.validations, deployData.version);
      }
    }

    if (proxyAddress !== undefined) {
      await setProxyKind(deployData.provider, proxyAddress, opts);
    }

    if (opts.kind === 'beacon') {
      throw new BeaconProxyUnsupportedError();
    }
  }
}

export async function deployBeaconImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  beaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  const deployData = await getDeployData(hre, ImplFactory, opts);

  let currentImplAddress;
  if (beaconAddress !== undefined) {
    // upgrade scenario
    await assertNotProxy(deployData.provider, beaconAddress);
    currentImplAddress = await getImplementationAddressFromBeacon(deployData.provider, beaconAddress);
  }
  return deployImpl(deployData, ImplFactory, opts, currentImplAddress);
}

async function deployImpl(
  deployData: any,
  ImplFactory: ContractFactory,
  opts: Options,
  currentImplAddress?: string,
): Promise<any> {
  assertUpgradeSafe(deployData.validations, deployData.version, deployData.fullOpts);
  const layout = deployData.layout;

  if (currentImplAddress !== undefined) {
    const manifest = await Manifest.forNetwork(deployData.provider);
    const currentLayout = await getStorageLayoutForAddress(manifest, deployData.validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, deployData.layout, deployData.fullOpts);
  }

  const impl = await fetchOrDeploy(deployData.version, deployData.provider, async () => {
    const abi = ImplFactory.interface.format(FormatTypes.minimal) as string[];
    const deployment = Object.assign({ abi }, await deploy(ImplFactory, ...deployData.fullOpts.constructorArgs));
    return { ...deployment, layout };
  });

  return { impl, kind: opts.kind };
}
