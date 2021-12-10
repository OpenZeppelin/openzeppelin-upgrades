import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  fetchOrDeploy,
  getBeaconAddress,
  getImplementationAddress,
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
import { getIBeaconFactory } from '.';
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

export enum DeployType {
  Proxy,
  Beacon,
}

export async function deployProxyImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  proxyOrBeaconAddress?: string,
): Promise<DeployedProxyImpl> {
  return deployImpl(hre, ImplFactory, opts, false, proxyOrBeaconAddress);
}

export async function deployBeaconImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  proxyOrBeaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  return deployImpl(hre, ImplFactory, opts, true, proxyOrBeaconAddress);
}

async function deployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  isBeacon: boolean,
  proxyOrBeaconAddress?: string,
): Promise<any> {
  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const encodedArgs = ImplFactory.interface.encodeDeploy(opts.constructorArgs);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode, encodedArgs);
  const layout = getStorageLayout(validations, version);

  if (isBeacon) {
    if (proxyOrBeaconAddress !== undefined) {
      if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
        throw new UpgradesError(
          'Address is a transparent or uups proxy which cannot be upgraded using upgradeBeacon().',
          () => 'Use upgradeProxy() instead.',
        );
      } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
        const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
        throw new UpgradesError(
          'Address is a beacon proxy which cannot be upgraded directly.',
          () =>
            `upgradeBeacon() must be called with a beacon address, not a beacon proxy address. Call upgradeBeacon() on the beacon address ${beaconAddress} instead.`,
        );
      }
    }
  } else {
    await processProxyKind();
  }

  const fullOpts = withDefaults(opts);

  assertUpgradeSafe(validations, version, fullOpts);

  if (proxyOrBeaconAddress !== undefined) {
    // upgrade scenario
    const manifest = await Manifest.forNetwork(provider);
    let currentImplAddress;
    if (isBeacon) {
      const IBeaconFactory = await getIBeaconFactory(hre, ImplFactory.signer);
      const beaconContract = IBeaconFactory.attach(proxyOrBeaconAddress);
      currentImplAddress = await beaconContract.implementation();
    } else {
      currentImplAddress = await getImplementationAddress(provider, proxyOrBeaconAddress);
    }
    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, fullOpts);
  }

  const impl = await fetchOrDeploy(version, provider, async () => {
    const abi = ImplFactory.interface.format(FormatTypes.minimal) as string[];
    const deployment = Object.assign({ abi }, await deploy(ImplFactory, ...fullOpts.constructorArgs));
    return { ...deployment, layout };
  });

  if (isBeacon) {
    return { impl };
  } else {
    return { impl, kind: opts.kind };
  }

  async function processProxyKind() {
    if (opts.kind === undefined) {
      if (proxyOrBeaconAddress !== undefined && (await isBeaconProxy(provider, proxyOrBeaconAddress))) {
        opts.kind = 'beacon';
      } else {
        opts.kind = inferProxyKind(validations, version);
      }
    }

    if (proxyOrBeaconAddress !== undefined) {
      await setProxyKind(provider, proxyOrBeaconAddress, opts);
    }

    if (opts.kind === 'beacon') {
      throw new BeaconProxyUnsupportedError();
    }
  }
}

export class BeaconProxyUnsupportedError extends UpgradesError {
  constructor() {
    super(
      'Beacon proxies are not supported with the current function.',
      () => 'Use deployBeacon(), deployBeaconProxy(), or upgradeBeacon() instead.',
    );
  }
}
