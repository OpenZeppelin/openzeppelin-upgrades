import {
  Manifest,
  getImplementationAddressFromProxy,
  EthereumProvider,
  getAdminAddress,
  compareImplBytecode,
  addProxyToManifest,
  ImportProxyUnsupportedError,
  getImplementationAddressFromBeacon,
  isBeacon,
  detectProxyKind,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  withDefaults,
  ImportProxyOptions,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
} from './utils';
import { simulateDeployAdmin, simulateDeployImpl } from './utils/simulate-deploy';

export async function importProxy(
  proxyOrBeacon: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: ImportProxyOptions = {},
): Promise<ContractInstance> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);

  const implAddress = await getImplementationAddressFromProxy(provider, proxyOrBeaconAddress);
  if (implAddress !== undefined) {
    await importProxyToManifest(provider, proxyOrBeaconAddress, implAddress, Contract, opts, manifest);

    return Contract.at(proxyOrBeaconAddress);
  } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
    const beaconImplAddress = await getImplementationAddressFromBeacon(provider, proxyOrBeaconAddress);
    await addImplToManifest(provider, beaconImplAddress, Contract, opts);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(Contract);
    return UpgradeableBeaconFactory.at(proxyOrBeaconAddress);
  } else {
    throw new ImportProxyUnsupportedError(proxyOrBeaconAddress);
  }
}

async function importProxyToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  implAddress: string,
  Contract: ContractClass,
  opts: ImportProxyOptions,
  manifest: Manifest,
) {
  await addImplToManifest(provider, implAddress, Contract, opts);
  const importKind = await detectProxyKind(provider, proxyAddress);
  if (importKind === 'transparent') {
    await addAdminToManifest(provider, proxyAddress, Contract, opts);
  }
  await addProxyToManifest(importKind, proxyAddress, manifest);
}

async function addImplToManifest(
  provider: EthereumProvider,
  implAddress: string,
  Contract: ContractClass,
  opts: ImportProxyOptions,
) {
  if (!opts.force) {
    await compareImplBytecode(provider, implAddress, Contract.bytecode);
  }
  await simulateDeployImpl(Contract, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: ImportProxyOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(Contract, opts, adminAddress);
}
