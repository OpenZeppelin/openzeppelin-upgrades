import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  fetchOrDeployAdmin,
} from '@openzeppelin/upgrades-core';

import {
  deploy,
  deployImpl,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  Options,
  withDefaults,
} from './utils';

export interface DeployFunction {
  (ImplFactory: ContractFactory, args?: unknown[], opts?: Options): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: Options): Promise<Contract>;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment): DeployFunction {
  return async function deployProxy(
    ImplFactory: ContractFactory,
    args: unknown[] | Options = [],
    opts: Options = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }
    const requiredOpts: Required<Options> = withDefaults(opts);

    const { provider } = hre.network;
    const impl = deployImpl(hre, ImplFactory, requiredOpts);
    const data = getInitializerData(ImplFactory, args, requiredOpts.initializer);

    let proxy: Contract;
    switch (requiredOpts.kind) {
      case 'auto':
      case 'uups':
        const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
        proxy = await ProxyFactory.deploy(impl, data);
        break;

      case 'transparent':
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory));
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxy = await TransparentUpgradeableProxyFactory.deploy(impl, adminAddress, data);
        break;
    }

    const inst = ImplFactory.attach(proxy.address);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxy.deployTransaction;
    return inst;
  };

  function getInitializerData(ImplFactory: ContractFactory, args: unknown[], initializer: string | false): string {
    if (initializer === false) {
      return '0x';
    }

    try {
      const fragment = ImplFactory.interface.getFunction(initializer);
      return ImplFactory.interface.encodeFunctionData(fragment, args);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (initializer === 'initialize' && args.length === 0 && e.message.includes('no matching function')) {
          return '0x';
        }
      }
      throw e;
    }
  }
}
