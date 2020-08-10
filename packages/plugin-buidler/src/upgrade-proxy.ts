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

export type PrepareUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: UpgradeOptions,
) => Promise<string>;

export type UpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: UpgradeOptions,
) => Promise<Contract>;

export interface UpgradeOptions {
  unsafeAllowCustomTypes?: boolean;
}

async function prepareUpgradeImpl(
  bre: BuidlerRuntimeEnvironment,
  manifest: Manifest,
  proxyAddress: string,
  implFactory: ContractFactory,
  opts: UpgradeOptions,
): Promise<string> {
  const { provider } = bre.network;
  const validations = await readValidations(bre);

  const version = getVersion(implFactory.bytecode);
  assertUpgradeSafe(validations, version, opts.unsafeAllowCustomTypes);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout, opts.unsafeAllowCustomTypes);

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(implFactory);
    return { ...deployment, layout };
  });
}

export function makePrepareUpgrade(bre: BuidlerRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = bre.network;
    const manifest = await Manifest.forNetwork(provider);

    return await prepareUpgradeImpl(bre, manifest, proxyAddress, ImplFactory, opts);
  };
}

export function makeUpgradeProxy(bre: BuidlerRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = bre.network;
    const manifest = await Manifest.forNetwork(provider);

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const admin = AdminFactory.attach(await getAdminAddress(provider, proxyAddress));
    const manifestAdmin = await manifest.getAdmin();

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    }

    const nextImpl = await prepareUpgradeImpl(bre, manifest, proxyAddress, ImplFactory, opts);
    await admin.upgrade(proxyAddress, nextImpl);

    return ImplFactory.attach(proxyAddress);
  };
}
