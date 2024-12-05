import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  getImplementationAddressFromProxy,
  addProxyToManifest,
  isBeacon,
  getImplementationAddressFromBeacon,
  inferProxyKind,
  isBeaconProxy,
  ProxyDeployment,
  hasCode,
  NoContractImportError,
  getAdminAddress,
  isEmptySlot,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import {
  simulateDeployImpl,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  ForceImportOptions,
} from './utils';
import { getDeployData } from './utils/deploy-impl';
import { attach, getSigner } from './utils/ethers';
import { ContractTypeOfFactory } from './type-extensions';

export interface ForceImportFunction {
  <F extends ContractFactory>(
    proxyAddress: string,
    ImplFactory: F,
    opts?: ForceImportOptions,
  ): Promise<ContractTypeOfFactory<F> | Contract>;
}

export function makeForceImport(hre: HardhatRuntimeEnvironment): ForceImportFunction {
  return async function forceImport<F extends ContractFactory>(
    addressOrInstance: ContractAddressOrInstance,
    ImplFactory: F,
    opts: ForceImportOptions = {},
  ): Promise<ContractTypeOfFactory<F> | Contract> {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const address = await getContractAddress(addressOrInstance);

    const implAddress = await getImplementationAddressFromProxy(provider, address);
    if (implAddress !== undefined) {
      await importProxyToManifest(provider, hre, address, implAddress, ImplFactory, opts, manifest);

      return attach(ImplFactory, address) as ContractTypeOfFactory<F>;
    } else if (await isBeacon(provider, address)) {
      const beaconImplAddress = await getImplementationAddressFromBeacon(provider, address);
      await addImplToManifest(hre, beaconImplAddress, ImplFactory, opts);

      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, getSigner(ImplFactory.runner));
      return attach(UpgradeableBeaconFactory, address) as Contract;
    } else {
      if (!(await hasCode(provider, address))) {
        throw new NoContractImportError(address);
      }
      await addImplToManifest(hre, address, ImplFactory, opts);
      return attach(ImplFactory, address) as ContractTypeOfFactory<F>;
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
    await assertNonEmptyAdminSlot(provider, proxyAddress);
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

async function assertNonEmptyAdminSlot(provider: EthereumProvider, proxyAddress: string) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  if (isEmptySlot(adminAddress)) {
    // Assert that the admin slot of a transparent proxy is not zero, otherwise the wrong kind may be imported.
    // Note: Transparent proxies should not have the zero address as the admin, according to TransparentUpgradeableProxy's _setAdmin function.
    throw new UpgradesError(
      `Proxy at ${proxyAddress} doesn't look like a transparent proxy`,
      () =>
        `The proxy doesn't look like a transparent proxy because its admin address slot is empty. ` +
        `Set the \`kind\` option to the kind of proxy that was deployed at ${proxyAddress} (either 'uups' or 'beacon')`,
    );
  }
}
