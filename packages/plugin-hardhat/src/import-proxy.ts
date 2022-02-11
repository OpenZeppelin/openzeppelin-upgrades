import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  getImplementationAddressFromProxy,
  getAdminAddress,
  detectProxyKindFromBytecode,
  getCode,
  getAndCompareImplBytecode,
  addProxyToManifest,
  isBeacon,
  ImportProxyUnsupportedError,
  ProxyDeployment,
  getImplementationAddressFromBeacon,
} from '@openzeppelin/upgrades-core';

import {
  ImportProxyOptions,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getBeaconProxyFactory,
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
      const importKind = await detectProxyKind(provider, hre, proxyOrBeaconAddress, ImplFactory, opts);
      await importProxyToManifest(
        provider,
        hre,
        proxyOrBeaconAddress,
        implAddress,
        ImplFactory,
        opts,
        importKind,
        manifest,
      );

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
  importKind: ProxyDeployment['kind'],
  manifest: Manifest,
) {
  await addImplToManifest(provider, hre, implAddress, ImplFactory, opts);
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
  const runtimeBytecode = await getAndCompareImplBytecode(provider, implAddress, ImplFactory.bytecode, opts.force);
  await simulateDeployImpl(hre, ImplFactory, opts, implAddress, runtimeBytecode);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: ImportProxyOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  const adminBytecode = await getCode(provider, adminAddress);
  // don't need to compare the admin contract's bytecode with creation code since it could be a custom admin, but store it to manifest in case it is used with the wrong network later on
  await simulateDeployAdmin(hre, ImplFactory, opts, adminAddress, adminBytecode);
}

async function detectProxyKind(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: ImportProxyOptions,
) {
  const UUPSProxy = (await getProxyFactory(hre, ImplFactory.signer)).bytecode;
  const TransparentProxy = (await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer)).bytecode;
  const BeaconProxy = (await getBeaconProxyFactory(hre, ImplFactory.signer)).bytecode;

  return await detectProxyKindFromBytecode(
    provider,
    proxyAddress,
    { UUPSProxy, TransparentProxy, BeaconProxy },
    opts.kind,
  );
}
