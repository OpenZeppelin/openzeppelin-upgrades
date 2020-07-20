import { network } from '@nomiclabs/buidler';
import fs from 'fs';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersionId,
} from '@openzeppelin/upgrades-core';

import { getProxyFactory, getProxyAdminFactory } from './proxy-factory';

export async function deployProxy(ImplFactory: ContractFactory, args: unknown[]): Promise<Contract> {
  const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

  const version = getVersionId(ImplFactory.bytecode);
  assertUpgradeSafe(validations, version);

  const impl = await fetchOrDeploy(version, network.provider, async () => {
    const { address } = await ImplFactory.deploy();
    const layout = getStorageLayout(validations, version);
    return { address, layout };
  });

  const AdminFactory = await getProxyAdminFactory(ImplFactory.signer);
  const adminAddress = await fetchOrDeployAdmin(network.provider, async () => {
    const { address } = await AdminFactory.deploy();
    return address;
  });

  // TODO: support choice of initializer function? support overloaded initialize function
  const data = ImplFactory.interface.encodeFunctionData('initialize', args);
  const ProxyFactory = await getProxyFactory(ImplFactory.signer);
  const proxy = await ProxyFactory.deploy(impl, adminAddress, data);

  const inst = ImplFactory.attach(proxy.address);
  // inst.deployTransaction = proxy.deployTransaction;
  return inst;
}
