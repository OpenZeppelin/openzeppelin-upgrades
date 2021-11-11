import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Manifest,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  fetchOrDeploy,
  getImplementationAddress,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
  inferProxyKind,
  setProxyKind,
  ValidationOptions,
  getBeaconAddress,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options, withDefaults } from './options';
import { readValidations } from './validations';
import { getIBeaconFactory } from '.';
import { FormatTypes } from 'ethers/lib/utils';

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
      if (await isTransparentOrUUPSProxy(proxyOrBeaconAddress)) {
        throw new Error(
          'Address is a transparent or uups proxy which cannot be upgraded using upgradeBeacon(). Use upgradeProxy() instead.',
        );
      } else if (await isBeaconProxy(proxyOrBeaconAddress)) {
        throw new Error(
          `Address is a beacon proxy which cannot be upgraded directly. Use upgradeBeacon() on its beacon address ${await getBeaconAddress(
            provider,
            proxyOrBeaconAddress,
          )} instead.`,
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
    const abi = ImplFactory.interface.format(FormatTypes.json);
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
      opts.kind = await inferProxyKind(validations, version, provider, proxyOrBeaconAddress);
    }

    if (proxyOrBeaconAddress !== undefined) {
      await setProxyKind(provider, proxyOrBeaconAddress, opts);
    }

    if (opts.kind === 'beacon') {
      throw new DeployKindUnsupported();
    }
  }

  async function isTransparentOrUUPSProxy(proxyOrBeaconAddress: string): Promise<boolean> {
    try {
      await getImplementationAddress(provider, proxyOrBeaconAddress);
      // if an exception was not encountered above, then this address is a transparent/uups proxy
      return true;
    } catch (e: any) {
      // error is expected for beacons since they don't use EIP-1967 slots
      return false;
    }
  }

  async function isBeaconProxy(proxyOrBeaconAddress: string): Promise<boolean> {
    try {
      await getBeaconAddress(provider, proxyOrBeaconAddress);
      // if an exception was not encountered above, then this address is a beacon proxy
      return true;
    } catch (e: any) {
      // error is expected for beacons since they don't use EIP-1967 slots
      return false;
    }
  }
}

export class DeployKindUnsupported extends Error {
  constructor() {
    super(
      'Beacon proxies are not supported with the current function. Use deployBeacon(), deployBeaconProxy(), or upgradeBeacon() instead.',
    );
  }
}
