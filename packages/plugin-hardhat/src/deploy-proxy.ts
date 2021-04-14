import chalk from 'chalk';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Manifest, fetchOrDeployProxy, fetchOrDeployAdmin, logWarning } from '@openzeppelin/upgrades-core';

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
  (ImplFactory: ContractFactory, args?: unknown[], opts?: DeployOptions): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: DeployOptions): Promise<Contract>;
}

export interface DeployOptions extends Options {
  initializer?: string | false;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment): DeployFunction {
  return async function deployProxy(
    ImplFactory: ContractFactory,
    args: unknown[] | DeployOptions = [],
    opts: DeployOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const requiredOpts = withDefaults(opts);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);
    const impl = await deployImpl(hre, ImplFactory, requiredOpts);
    const data = getInitializerData(ImplFactory, args, opts.initializer);

    if (requiredOpts.kind === 'uups' && (await manifest.getAdmin())) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('uups').`,
        `Changes to the admin will have no affect on this new proxy.`,
      ]);
    }

    let proxyAddress: string;
    switch (requiredOpts.kind) {
      case 'uups': {
        const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
        proxyAddress = await fetchOrDeployProxy(provider, 'uups', () => deploy(ProxyFactory, impl, data));
        break;
      }

      case 'auto':
      case 'transparent': {
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory));
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxyAddress = await fetchOrDeployProxy(provider, 'transparent', () =>
          deploy(TransparentUpgradeableProxyFactory, impl, adminAddress, data),
        );
        break;
      }
    }

    const { txHash } = await manifest.getProxyFromAddress(proxyAddress);

    const inst = ImplFactory.attach(proxyAddress);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = await inst.provider.getTransaction(txHash);
    return inst;
  };

  function getInitializerData(ImplFactory: ContractFactory, args: unknown[], initializer?: string | false): string {
    if (initializer === false) {
      return '0x';
    }

    const allowNoInitialization = initializer === undefined && args.length === 0;
    initializer = initializer ?? 'initialize';

    try {
      const fragment = ImplFactory.interface.getFunction(initializer);
      return ImplFactory.interface.encodeFunctionData(fragment, args);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (allowNoInitialization && args.length === 0 && e.message.includes('no matching function')) {
          return '0x';
        }
      }
      throw e;
    }
  }
}
