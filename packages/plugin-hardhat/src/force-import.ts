import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { EthereumProvider } from 'hardhat/types/providers';
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
} from './utils/index.js';
import { getDeployData } from './utils/deploy-impl.js';
import { attach, getSigner } from './utils/ethers.js';

export interface ForceImportFunction {
  (proxyAddress: string, ImplFactory: ContractFactory, opts?: ForceImportOptions): Promise<Contract>;
}

export function makeForceImport(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): ForceImportFunction {
  return async function forceImport(
    addressOrInstance: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: ForceImportOptions = {},
  ) {
    const { ethers } = connection;
    const provider = ethers.provider as unknown as EthereumProvider;
    const manifest = await Manifest.forNetwork(provider);

    const address = await getContractAddress(addressOrInstance);

    const implAddress = await getImplementationAddressFromProxy(provider, address);
    if (implAddress !== undefined) {
      await importProxyToManifest(provider, hre, address, implAddress, ImplFactory, opts, manifest, connection);

      return attach(ImplFactory, address);
    } else if (await isBeacon(provider, address)) {
      const beaconImplAddress = await getImplementationAddressFromBeacon(provider, address);
      await addImplToManifest(hre, beaconImplAddress, ImplFactory, opts, connection);

      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(connection, getSigner(ImplFactory.runner));
      return attach(UpgradeableBeaconFactory, address);
    } else {
      if (!(await hasCode(provider, address))) {
        throw new NoContractImportError(address);
      }
      await addImplToManifest(hre, address, ImplFactory, opts, connection);
      return attach(ImplFactory, address);
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
  connection: NetworkConnection,
) {
  await addImplToManifest(hre, implAddress, ImplFactory, opts, connection);

  let importKind: ProxyDeployment['kind'];
  if (opts.kind === undefined) {
    if (await isBeaconProxy(provider, proxyAddress)) {
      importKind = 'beacon';
    } else {
      const deployData = await getDeployData(hre, ImplFactory, opts, connection);
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
  connection: NetworkConnection,
) {
  await simulateDeployImpl(hre, ImplFactory, opts, implAddress, connection);
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
