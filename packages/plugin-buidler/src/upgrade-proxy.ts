import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import { getProxyAdminFactory } from './proxy-factory';
import { readValidations } from './validations';
import { deploy } from './utils/deploy';

export type UpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: UpgradeOptions,
) => Promise<Contract>;

export interface UpgradeOptions {
  dangerousIgnoreStructsAndEnumChecks?: boolean;
}

export function makeUpgradeProxy(bre: BuidlerRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = bre.network;
    const validations = await readValidations(bre);

    const version = getVersion(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version, opts.dangerousIgnoreStructsAndEnumChecks);

    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const manifest = await Manifest.forNetwork(provider);
    const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

    const layout = getStorageLayout(validations, version);
    assertStorageUpgradeSafe(deployment.layout, layout);

    const nextImpl = await fetchOrDeploy(version, provider, async () => {
      const deployment = await deploy(ImplFactory);
      return { ...deployment, layout };
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
