import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { ContractFactory, Contract } from 'ethers';
import fs from 'fs';

import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
} from '@openzeppelin/upgrades-core';
import { getProxyFactory, getProxyAdminFactory } from './proxy-factory';

export type DeployFunction = (ImplFactory: ContractFactory, args: unknown[]) => Promise<Contract>;

export function makeDeployProxy(bre: BuidlerRuntimeEnvironment): DeployFunction {
  return async function deployProxy(ImplFactory, args) {
    const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

    const version = getVersion(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version);

    const impl = await fetchOrDeploy(version, bre.network.provider, async () => {
      const { address } = await ImplFactory.deploy();
      const layout = getStorageLayout(validations, version);
      return { address, layout };
    });

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const adminAddress = await fetchOrDeployAdmin(bre.network.provider, () => AdminFactory.deploy());

    // TODO: support choice of initializer function? support overloaded initialize function
    const data = ImplFactory.interface.encodeFunctionData('initialize', args);
    const ProxyFactory = await getProxyFactory(bre, ImplFactory.signer);
    const proxy = await ProxyFactory.deploy(impl, adminAddress, data);

    const inst = ImplFactory.attach(proxy.address);
    // inst.deployTransaction = proxy.deployTransaction;
    return inst;
  };
}
