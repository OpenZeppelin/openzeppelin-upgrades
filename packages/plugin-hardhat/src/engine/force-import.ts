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
import type { EthereumProvider } from 'hardhat/types/providers';

import type { ContractInfo, EngineBinding } from './binding.js';
import { getDeployData, simulateDeployImpl } from './deploy-impl.js';
import type { ForceImportOptions } from './options.js';

/**
 * How the imported address was classified, so the binding can attach the right instance: a proxy
 * and a plain implementation both attach the named contract, while a beacon attaches a beacon.
 */
export type ForceImportClassification = 'proxy' | 'beacon' | 'impl';

/**
 * Client-neutral orchestration of `forceImport`: records the implementation (and, for a proxy, the
 * proxy itself) in the manifest, and reports how the address was classified.
 */
export async function forceImport(
  binding: EngineBinding,
  address: string,
  implInfo: ContractInfo,
  opts: ForceImportOptions,
): Promise<ForceImportClassification> {
  const provider = binding.provider;
  const manifest = await Manifest.forNetwork(provider);

  const implAddress = await getImplementationAddressFromProxy(provider, address);
  if (implAddress !== undefined) {
    await importProxyToManifest(binding, provider, address, implAddress, implInfo, opts, manifest);
    return 'proxy';
  } else if (await isBeacon(provider, address)) {
    const beaconImplAddress = await getImplementationAddressFromBeacon(provider, address);
    await simulateDeployImpl(binding, implInfo, opts, beaconImplAddress);
    return 'beacon';
  } else {
    if (!(await hasCode(provider, address))) {
      throw new NoContractImportError(address);
    }
    await simulateDeployImpl(binding, implInfo, opts, address);
    return 'impl';
  }
}

async function importProxyToManifest(
  binding: EngineBinding,
  provider: EthereumProvider,
  proxyAddress: string,
  implAddress: string,
  implInfo: ContractInfo,
  opts: ForceImportOptions,
  manifest: Manifest,
) {
  await simulateDeployImpl(binding, implInfo, opts, implAddress);

  let importKind: ProxyDeployment['kind'];
  if (opts.kind === undefined) {
    if (await isBeaconProxy(provider, proxyAddress)) {
      importKind = 'beacon';
    } else {
      const deployData = await getDeployData(binding, implInfo, opts);
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
