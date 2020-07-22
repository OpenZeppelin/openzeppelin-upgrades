import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { ContractFactory, Contract } from 'ethers';
import fs from 'fs';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersionId,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import { getProxyAdminFactory } from './proxy-factory';

export type UpgradeFunction = (proxyAddress: string, ImplFactory: ContractFactory) => Promise<Contract>;

export function makeUpgradeProxy(bre: BuidlerRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory) {
    const { provider } = bre.network;
    const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

    const version = getVersionId(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version);

    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const manifest = await Manifest.forNetwork(provider);
    const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

    const layout = getStorageLayout(validations, version);
    assertStorageUpgradeSafe(deployment.layout, layout);

    const nextImpl = await fetchOrDeploy(version, provider, async () => {
      const { address } = await ImplFactory.deploy();
      return { address, layout };
    });

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const admin = await AdminFactory.attach(await getAdminAddress(provider, proxyAddress));
    const manifestAdmin = await manifest.getAdmin();

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the registered ProxyAdmin contract');
    }

    await admin.upgrade(proxyAddress, nextImpl);

    return ImplFactory.attach(proxyAddress);
  };
}
