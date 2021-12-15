import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  fetchOrDeploy,
  getBeaconAddress,
  getImplementationAddress,
  getImplementationAddressFromBeacon,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
  inferProxyKind,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  Manifest,
  setProxyKind,
  UpgradesError,
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
    const { provider } = hre.network;
    await assertNotProxy(beaconAddress);
    currentImplAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
  }
  return deployImpl(deployData, ImplFactory, opts, currentImplAddress);

  async function assertNotProxy(address: string) {
    if (await isTransparentOrUUPSProxy(deployData.provider, address)) {
      throw new UpgradesError(
        'Address is a transparent or UUPS proxy which cannot be upgraded using upgradeBeacon().',
        () => 'Use upgradeProxy() instead.',
      );
    } else if (await isBeaconProxy(deployData.provider, address)) {
      const beaconAddress = await getBeaconAddress(deployData.provider, address);
      throw new UpgradesError(
        'Address is a beacon proxy which cannot be upgraded directly.',
        () =>
          `upgradeBeacon() must be called with a beacon address, not a beacon proxy address. Call upgradeBeacon() on the beacon address ${beaconAddress} instead.`,
      );
    }
  }
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

export class BeaconProxyUnsupportedError extends UpgradesError {
  constructor() {
    super(
      'Beacon proxies are not supported with the current function.',
      () => 'Use deployBeacon(), deployBeaconProxy(), or upgradeBeacon() instead.',
    );
  }
}
