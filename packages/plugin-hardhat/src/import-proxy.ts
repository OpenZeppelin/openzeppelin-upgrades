import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  getImplementationAddressFromProxy,
  getAdminAddress,
  compareImplBytecode,
  addProxyToManifest,
  isBeacon,
  ImportProxyUnsupportedError,
  getImplementationAddressFromBeacon,
  detectProxyKind,
} from '@openzeppelin/upgrades-core';

import {
  ImportProxyOptions,
  simulateDeployImpl,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
} from './utils';
import { simulateDeployAdmin } from './utils/simulate-deploy';

export interface ImportProxyFunction {
  (proxyAddress: string, ImplFactory: ContractFactory, opts?: ImportProxyOptions): Promise<Contract>;
}

export function makeImportProxy(hre: HardhatRuntimeEnvironment): ImportProxyFunction {
  return async function importProxy(
    proxyOrBeacon: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: ImportProxyOptions = {},
  ) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);

    const implAddress = await getImplementationAddressFromProxy(provider, proxyOrBeaconAddress);
    if (implAddress !== undefined) {
      await importProxyToManifest(provider, hre, proxyOrBeaconAddress, implAddress, ImplFactory, opts, manifest);

      return ImplFactory.attach(proxyOrBeaconAddress);
    } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
      const beaconImplAddress = await getImplementationAddressFromBeacon(provider, proxyOrBeaconAddress);
      await addImplToManifest(provider, hre, beaconImplAddress, ImplFactory, opts);

      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
      return UpgradeableBeaconFactory.attach(proxyOrBeaconAddress);
    } else {
      throw new ImportProxyUnsupportedError(proxyOrBeaconAddress);
    }
  };
}

async function importProxyToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  implAddress: string,
  ImplFactory: ContractFactory,
  opts: ImportProxyOptions,
  manifest: Manifest,
) {
  await addImplToManifest(provider, hre, implAddress, ImplFactory, opts);
  const importKind = await detectProxyKind(provider, proxyAddress);
  if (importKind === 'transparent') {
    await addAdminToManifest(provider, hre, proxyAddress, ImplFactory, opts);
  }
  await addProxyToManifest(importKind, proxyAddress, manifest);
}

async function addImplToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  implAddress: string,
  ImplFactory: ContractFactory,
  opts: ImportProxyOptions,
) {
  if (!opts.force) {
    await compareImplBytecode(provider, implAddress, ImplFactory.bytecode);
  }
  await simulateDeployImpl(hre, ImplFactory, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: ImportProxyOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(hre, ImplFactory, opts, adminAddress);
}
