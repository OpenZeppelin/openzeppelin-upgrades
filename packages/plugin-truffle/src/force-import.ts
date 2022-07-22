import {
  Manifest,
  getImplementationAddressFromProxy,
  EthereumProvider,
  getAdminAddress,
  addProxyToManifest,
  getImplementationAddressFromBeacon,
  isBeacon,
  ForceImportUnsupportedError,
  ProxyDeployment,
  isBeaconProxy,
  inferProxyKind,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  withDefaults,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  Options,
  getDeployData,
} from './utils';
import { simulateDeployAdmin, simulateDeployImpl } from './utils/simulate-deploy';

export async function forceImport(
  proxyOrBeacon: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: Options = {},
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
    await addImplToManifest(beaconImplAddress, Contract, opts);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(Contract);
    return UpgradeableBeaconFactory.at(proxyOrBeaconAddress);
  } else {
    throw new ForceImportUnsupportedError(proxyOrBeaconAddress);
  }
}

async function importProxyToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  implAddress: string,
  Contract: ContractClass,
  opts: Options,
  manifest: Manifest,
) {
  await addImplToManifest(implAddress, Contract, opts);

  let importKind: ProxyDeployment['kind'];
  if (opts.kind === undefined) {
    if (await isBeaconProxy(provider, proxyAddress)) {
      importKind = 'beacon';
    } else {
      const deployData = await getDeployData(opts, Contract);
      importKind = inferProxyKind(deployData.validations, deployData.version);
    }
  } else {
    importKind = opts.kind;
  }

  if (importKind === 'transparent') {
    await addAdminToManifest(provider, proxyAddress, Contract, opts);
  }
  await addProxyToManifest(importKind, proxyAddress, manifest);
}

async function addImplToManifest(implAddress: string, Contract: ContractClass, opts: Options) {
  await simulateDeployImpl(Contract, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(Contract, opts, adminAddress);
}
