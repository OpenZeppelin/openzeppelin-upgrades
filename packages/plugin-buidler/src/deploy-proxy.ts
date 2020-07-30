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

export type DeployFunction = (ImplFactory: ContractFactory, args?: unknown[]) => Promise<Contract>;

export interface Options {
  initializer?: string;
}

export function makeDeployProxy(bre: BuidlerRuntimeEnvironment): DeployFunction {
  return async function deployProxy(ImplFactory, args = [], opts: Options = {}) {
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
    const data = getInitializerData(ImplFactory, args, opts.initializer);
    const ProxyFactory = await getProxyFactory(bre, ImplFactory.signer);
    const proxy = await ProxyFactory.deploy(impl, adminAddress, data);

    const inst = ImplFactory.attach(proxy.address);
    // inst.deployTransaction = proxy.deployTransaction;
    return inst;
  };

  function getInitializerData(ImplFactory: ContractFactory, args: unknown[], initializer?: string): string {
    const allowNoInitialization = initializer === undefined && args.length === 0;
    initializer = initializer ?? 'initialize';

    const initializers = ImplFactory.interface.fragments.filter(f => f.name === initializer);

    if (initializers.length > 0) {
      return ImplFactory.interface.encodeFunctionData(initializer, args);
    } else if (allowNoInitialization) {
      return '0x';
    } else {
      throw new Error(`Contract does not have a function \`${initializer}\``);
    }
  }
}
