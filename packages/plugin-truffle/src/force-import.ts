import {
  Manifest,
  getImplementationAddressFromProxy,
  EthereumProvider,
  getAdminAddress,
  addProxyToManifest,
  getImplementationAddressFromBeacon,
  isBeacon,
  ProxyDeployment,
  isBeaconProxy,
  inferProxyKind,
  hasCode,
  NoContractImportError,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  withDefaults,
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  ForceImportOptions,
  getDeployData,
} from './utils';
import { simulateDeployAdmin, simulateDeployImpl } from './utils/simulate-deploy';

export async function forceImport(
  addressOrInstance: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: ForceImportOptions = {},
): Promise<ContractInstance> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  const address = getContractAddress(addressOrInstance);

  const implAddress = await getImplementationAddressFromProxy(provider, address);
  if (implAddress !== undefined) {
    await importProxyToManifest(provider, address, implAddress, Contract, opts, manifest);

    return Contract.at(address);
  } else if (await isBeacon(provider, address)) {
    const beaconImplAddress = await getImplementationAddressFromBeacon(provider, address);
    await addImplToManifest(beaconImplAddress, Contract, opts);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(Contract);
    return UpgradeableBeaconFactory.at(address);
  } else {
    if (!(await hasCode(provider, address))) {
      throw new NoContractImportError(address);
    }
    await addImplToManifest(address, Contract, opts);
    return Contract.at(address);
  }
}

async function importProxyToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  implAddress: string,
  Contract: ContractClass,
  opts: ForceImportOptions,
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

async function addImplToManifest(implAddress: string, Contract: ContractClass, opts: ForceImportOptions) {
  await simulateDeployImpl(Contract, opts, implAddress);
}

async function addAdminToManifest(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: ForceImportOptions,
) {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  await simulateDeployAdmin(Contract, opts, adminAddress);
}
