import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  ValidationOptions,
  fetchOrDeployAdmin,
  logWarning,
  withValidationDefaults,
  ProxyDeployment,
} from '@openzeppelin/upgrades-core';

import {
  deploy,
  deployImpl,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
} from './utils';

export interface DeployFunction {
  (ImplFactory: ContractFactory, args?: unknown[], opts?: DeployOptions): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: DeployOptions): Promise<Contract>;
}

export interface DeployOptions extends ValidationOptions {
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

    const requiredOpts = withValidationDefaults(opts);
    const { kind } = requiredOpts;

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    if (kind === 'uups') {
      if (await manifest.getAdmin()) {
        logWarning(`A proxy admin was previously deployed on this network`, [
          `This is not natively used with the current kind of proxy ('uups').`,
          `Changes to the admin will have no effect on this new proxy.`,
        ]);
      }
    }

    const impl = await deployImpl(hre, ImplFactory, requiredOpts);
    const data = getInitializerData(ImplFactory, args, opts.initializer);

    let proxyDeployment: Required<ProxyDeployment>;
    switch (kind) {
      case 'uups': {
        const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign({ kind }, await deploy(ProxyFactory, impl, data));
        break;
      }

      case 'transparent': {
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory));
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign(
          { kind },
          await deploy(TransparentUpgradeableProxyFactory, impl, adminAddress, data),
        );
        break;
      }
    }

    await manifest.addProxy(proxyDeployment);

    const inst = ImplFactory.attach(proxyDeployment.address);
    const deployTransaction = await inst.provider.getTransaction(proxyDeployment.txHash);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = deployTransaction;
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
        if (allowNoInitialization && e.message.includes('no matching function')) {
          return '0x';
        }
      }
      throw e;
    }
  }
}
