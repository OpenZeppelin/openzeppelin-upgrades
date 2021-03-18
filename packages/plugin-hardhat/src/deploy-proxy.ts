import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
  getUnlinkedBytecode,
} from '@openzeppelin/upgrades-core';

import {
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
} from './proxy-factory';

import { readValidations } from './validations';
import { deploy } from './utils/deploy';
import { DeployOptions } from './types';

export interface DeployFunction {
  (ImplFactory: ContractFactory, args?: unknown[], opts?: DeployOptions): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: DeployOptions): Promise<Contract>;
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

    if (opts.kind === 'transparent') {
      opts.unsafeAllow = opts.unsafeAllow || [];
      opts.unsafeAllow.push('no-public-upgrade-fn');
    }

    const { provider } = hre.network;
    const validations = await readValidations(hre);

    const unlinkedBytecode: string = getUnlinkedBytecode(validations, ImplFactory.bytecode);
    const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
    assertUpgradeSafe(validations, version, opts);

    const impl = await fetchOrDeploy(version, provider, async () => {
      const deployment = await deploy(ImplFactory);
      const layout = getStorageLayout(validations, version);
      return { ...deployment, layout };
    });

    const data = getInitializerData(ImplFactory, args, opts.initializer);

    let proxy: Contract;
    switch(opts.kind) {
      case undefined:
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

      default:
        throw new Error('unknown proxy kind');
    }

    const inst = ImplFactory.attach(proxy.address);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxy.deployTransaction;
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
