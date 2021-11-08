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
  EthereumProvider,
  ProxyDeployment,
  DeploymentNotFound,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options, withDefaults } from './options';
import { readValidations } from './validations';
import { getIBeaconFactory, getUpgradeableBeaconFactory } from '.';

interface DeployedImplForBeacon {
  impl: string;
}

export async function deployImplForBeacon(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  beaconAddress?: string,
): Promise<DeployedImplForBeacon> {
  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const encodedArgs = ImplFactory.interface.encodeDeploy(opts.constructorArgs);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode, encodedArgs);
  const layout = getStorageLayout(validations, version);

  if (beaconAddress !== undefined) {
    try {
      if (await getImplementationAddress(provider, beaconAddress) !== undefined) {
        throw new Error('Address is a regular proxy and cannot be upgraded using upgradeBeacon(). Use upgradeProxy() instead.');
      }  
    } catch (e: any) {
      // error is expected for beacons since they don't use EIP-1967 implementation slots
    }
  }

  const fullOpts = withDefaults(opts);

  assertUpgradeSafe(validations, version, fullOpts);

  if (beaconAddress !== undefined) {
    const manifest = await Manifest.forNetwork(provider);
    let currentImplAddress: string;

    const IBeaconFactory = await getIBeaconFactory(hre, ImplFactory.signer);
    const beaconContract = IBeaconFactory.attach(beaconAddress);
    currentImplAddress = await beaconContract.implementation();

    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, fullOpts);
  }

  const impl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(ImplFactory, ...fullOpts.constructorArgs);
    return { ...deployment, layout };
  });

  return { impl };
}
