import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  getUnlinkedBytecode,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';

import { getProxyAdminFactory } from './proxy-factory';
import { readValidations } from './validations';
import { defaultDeploy, DeploymentExecutor, intoCoreDeployment } from './utils/deploy';

export interface UpgradeOptions extends ValidationOptions {
  executor?: DeploymentExecutor;
}

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

async function prepareUpgradeImpl(
  hre: HardhatRuntimeEnvironment,
  manifest: Manifest,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
): Promise<string> {
  const deploy = opts.executor || defaultDeploy;
  const { provider } = hre.network;
  const validations = await readValidations(hre);

  const unlinkedBytecode: string = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
  assertUpgradeSafe(validations, version, opts);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout, opts.unsafeAllowCustomTypes);

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = intoCoreDeployment(await deploy(ImplFactory, []));
    return { ...deployment, layout };
  });
}

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    return await prepareUpgradeImpl(hre, manifest, proxyAddress, ImplFactory, opts);
  };
}

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
    const admin = AdminFactory.attach(await getAdminAddress(provider, proxyAddress));
    const manifestAdmin = await manifest.getAdmin();

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    }

    const nextImpl = await prepareUpgradeImpl(hre, manifest, proxyAddress, ImplFactory, opts);
    await admin.upgrade(proxyAddress, nextImpl);

    return ImplFactory.attach(proxyAddress);
  };
}
