import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
} from '@openzeppelin/upgrades-core';

import { getProxyFactory, getProxyAdminFactory } from './proxy-factory';
import { readValidations } from './validations';
import { deploy } from './utils/deploy';

export type DeployFunction = (ImplFactory: ContractFactory, args: unknown[]) => Promise<Contract>;

export function makeDeployProxy(bre: BuidlerRuntimeEnvironment): DeployFunction {
  return async function deployProxy(ImplFactory, args) {
    const validations = await readValidations(bre);

    const version = getVersion(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version);

    const impl = await fetchOrDeploy(version, bre.network.provider, async () => {
      const deployment = await deploy(ImplFactory);
      const layout = getStorageLayout(validations, version);
      return { ...deployment, layout };
    });

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const adminAddress = await fetchOrDeployAdmin(bre.network.provider, () => deploy(AdminFactory));

    // TODO: support choice of initializer function? support overloaded initialize function
    const data = ImplFactory.interface.encodeFunctionData('initialize', args);
    const ProxyFactory = await getProxyFactory(bre, ImplFactory.signer);
    const proxy = await ProxyFactory.deploy(impl, adminAddress, data);

    const inst = ImplFactory.attach(proxy.address);
    // inst.deployTransaction = proxy.deployTransaction;
    return inst;
  };
}
