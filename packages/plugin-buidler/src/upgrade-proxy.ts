import { BuidlerRuntimeEnvironment, EthereumProvider } from '@nomiclabs/buidler/types';
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
  ImplDeployment,
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

async function getDeployment(
  provider: EthereumProvider,
  manifest: Manifest,
  proxyAddress: string,
): Promise<ImplDeployment> {
  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  return await manifest.getDeploymentFromAddress(currentImplAddress);
}

async function prepareUpgradeImpl(
  bre: BuidlerRuntimeEnvironment,
  currentDeployment: ImplDeployment,
  implFactory: ContractFactory,
  opts: UpgradeOptions,
): Promise<string> {
  const { provider } = bre.network;
  const validations = await readValidations(bre);

  const version = getVersion(implFactory.bytecode);
  assertUpgradeSafe(validations, version, opts.unsafeAllowCustomTypes);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(currentDeployment.layout, layout, opts.unsafeAllowCustomTypes);

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(implFactory);
    return { ...deployment, layout };
  });
}

export function makePrepareUpgrade(bre: BuidlerRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = bre.network;
    const manifest = await Manifest.forNetwork(provider);

    const deployment = await getDeployment(provider, manifest, proxyAddress);
    return await prepareUpgradeImpl(bre, deployment, ImplFactory, opts);
  };
}

export function makeUpgradeProxy(bre: BuidlerRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = bre.network;
    const manifest = await Manifest.forNetwork(provider);

    const deployment = await getDeployment(provider, manifest, proxyAddress);
    const nextImpl = await prepareUpgradeImpl(bre, deployment, ImplFactory, opts);

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const admin = AdminFactory.attach(await getAdminAddress(provider, proxyAddress));
    const manifestAdmin = await manifest.getAdmin();

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the registered ProxyAdmin contract');
    }

    await admin.upgrade(proxyAddress, nextImpl);

    return ImplFactory.attach(proxyAddress);
  };
}
