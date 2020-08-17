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

export type DeployFunction = (
  ImplFactory: ContractFactory,
  args?: unknown[],
  opts?: DeployOptions,
) => Promise<Contract>;

export interface DeployOptions {
  initializer?: string;
  unsafeAllowCustomTypes?: boolean;
}

export function makeDeployProxy(bre: BuidlerRuntimeEnvironment): DeployFunction {
  return async function deployProxy(ImplFactory, args = [], opts = {}) {
    const { provider } = bre.network;
    const validations = await readValidations(bre);

    const version = getVersion(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version, opts.unsafeAllowCustomTypes);

    const impl = await fetchOrDeploy(version, provider, async () => {
      const deployment = await deploy(ImplFactory);
      const layout = getStorageLayout(validations, version);
      return { ...deployment, layout };
    });

    const AdminFactory = await getProxyAdminFactory(bre, ImplFactory.signer);
    const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory));

    const data = getInitializerData(ImplFactory, args, opts.initializer);
    const ProxyFactory = await getProxyFactory(bre, ImplFactory.signer);
    const proxy = await ProxyFactory.deploy(impl, adminAddress, data);

    const inst = ImplFactory.attach(proxy.address);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxy.deployTransaction;
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
