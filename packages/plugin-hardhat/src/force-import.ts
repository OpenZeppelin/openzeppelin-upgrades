import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  getImplementationAddressFromProxy,
  getAdminAddress,
  addProxyToManifest,
  isBeacon,
  getImplementationAddressFromBeacon,
  inferProxyKind,
  isBeaconProxy,
  ProxyDeployment,
  hasCode,
  NoContractImportError,
} from '@openzeppelin/upgrades-core';

import {
  simulateDeployImpl,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  ForceImportOptions,
} from './utils';
import { simulateDeployAdmin } from './utils/simulate-deploy';
import { getDeployData } from './utils/deploy-impl';

export interface ForceImportFunction {
  (proxyAddress: string, ImplFactory: ContractFactory, opts?: ForceImportOptions): Promise<Contract>;
}

export function makeForceImport(hre: HardhatRuntimeEnvironment): ForceImportFunction {
  return async function forceImport(
    addressOrInstance: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: ForceImportOptions = {},
  ) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const address = getContractAddress(addressOrInstance);

    const implAddress = await getImplementationAddressFromProxy(provider, address);
    if (implAddress !== undefined) {
      await importProxyToManifest(provider, hre, address, implAddress, ImplFactory, opts, manifest);

      return ImplFactory.attach(address);
    } else if (await isBeacon(provider, address)) {
      const beaconImplAddress = await getImplementationAddressFromBeacon(provider, address);
      await addImplToManifest(hre, beaconImplAddress, ImplFactory, opts);

      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
      return UpgradeableBeaconFactory.attach(address);
    } else {
      if (!(await hasCode(provider, address))) {
        throw new NoContractImportError(address);
      }
      await addImplToManifest(hre, address, ImplFactory, opts);
      return ImplFactory.attach(address);
    }
  };
}

async function importProxyToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  implAddress: string,
  ImplFactory: ContractFactory,
  opts: ForceImportOptions,
  manifest: Manifest,
) {
  await addImplToManifest(hre, implAddress, ImplFactory, opts);

  let importKind: ProxyDeployment['kind'];
  if (opts.kind === undefined) {
    if (await isBeaconProxy(provider, proxyAddress)) {
      importKind = 'beacon';
    } else {
      const deployData = await getDeployData(hre, ImplFactory, opts);
      importKind = inferProxyKind(deployData.validations, deployData.version);
    }
  } else {
    importKind = opts.kind;
  }

  if (importKind === 'transparent') {
    await addAdminToManifest(provider, hre, proxyAddress, ImplFactory, opts);
  }
  await addProxyToManifest(importKind, proxyAddress, manifest);
}

async function addImplToManifest(
  hre: HardhatRuntimeEnvironment,
  implAddress: string,
  ImplFactory: ContractFactory,
  opts: ForceImportOptions,
) {
  await simulateDeployImpl(hre, ImplFactory, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: ForceImportOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(hre, ImplFactory, opts, adminAddress);
}
