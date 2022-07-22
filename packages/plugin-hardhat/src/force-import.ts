import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  getImplementationAddressFromProxy,
  getAdminAddress,
  addProxyToManifest,
  isBeacon,
  getImplementationAddressFromBeacon,
  ForceImportUnsupportedError,
  inferProxyKind,
  isBeaconProxy,
  ProxyDeployment,
} from '@openzeppelin/upgrades-core';

import {
  simulateDeployImpl,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  Options,
} from './utils';
import { simulateDeployAdmin } from './utils/simulate-deploy';
import { getDeployData } from './utils/deploy-impl';

export interface ForceImportFunction {
  (proxyAddress: string, ImplFactory: ContractFactory, opts?: Options): Promise<Contract>;
}

export function makeForceImport(hre: HardhatRuntimeEnvironment): ForceImportFunction {
  return async function forceImport(
    proxyOrBeacon: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: Options = {},
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
      await addImplToManifest(hre, beaconImplAddress, ImplFactory, opts);

      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
      return UpgradeableBeaconFactory.attach(proxyOrBeaconAddress);
    } else {
      throw new ForceImportUnsupportedError(proxyOrBeaconAddress);
    }
  };
}

async function importProxyToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  implAddress: string,
  ImplFactory: ContractFactory,
  opts: Options,
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
  opts: Options,
) {
  await simulateDeployImpl(hre, ImplFactory, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: Options,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(hre, ImplFactory, opts, adminAddress);
}
