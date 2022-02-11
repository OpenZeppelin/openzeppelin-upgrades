import {
  Manifest,
  getImplementationAddressFromProxy,
  EthereumProvider,
  detectProxyKindFromBytecode,
  getCode,
  getAdminAddress,
  getAndCompareImplBytecode,
  addProxyToManifest,
  ProxyDeployment,
  ImportProxyUnsupportedError,
  getImplementationAddressFromBeacon,
  isBeacon,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  withDefaults,
  getBeaconProxyFactory,
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
    const importKind = await detectProxyKind(provider, proxyOrBeaconAddress, Contract, opts);
    await importProxyToManifest(provider, proxyOrBeaconAddress, implAddress, Contract, opts, importKind, manifest);

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
  importKind: ProxyDeployment['kind'],
  manifest: Manifest,
) {
  await addImplToManifest(provider, implAddress, Contract, opts);
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
  const runtimeBytecode = await getAndCompareImplBytecode(provider, implAddress, Contract.bytecode, opts.force);
  await simulateDeployImpl(Contract, opts, implAddress, runtimeBytecode);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: ImportProxyOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  const adminBytecode = await getCode(provider, adminAddress);
  // don't need to compare the admin contract's bytecode with creation code since it could be a custom admin, but store it to manifest in case it is used with the wrong network later on
  await simulateDeployAdmin(Contract, opts, adminAddress, adminBytecode);
}

async function detectProxyKind(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: ImportProxyOptions,
) {
  const UUPSProxy = getProxyFactory(Contract).bytecode;
  const TransparentProxy = getTransparentUpgradeableProxyFactory(Contract).bytecode;
  const BeaconProxy = getBeaconProxyFactory(Contract).bytecode;

  return await detectProxyKindFromBytecode(
    provider,
    proxyAddress,
    { UUPSProxy, TransparentProxy, BeaconProxy },
    opts.kind,
  );
}
