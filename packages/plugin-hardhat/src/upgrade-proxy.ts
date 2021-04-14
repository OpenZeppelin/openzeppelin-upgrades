import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';

import {
  deployImpl,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  Options,
  withDefaults,
} from './utils';

export type UpgradeFunction = (proxyAddress: string, ImplFactory: ContractFactory, opts?: Options) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts: Options = {}) {
    const requiredOpts: Required<Options> = withDefaults(opts);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    if (requiredOpts.kind === 'auto') {
      try {
        const { kind } = await manifest.getProxyFromAddress(proxyAddress);
        requiredOpts.kind = kind;
      } catch (e) {
        if (e instanceof Error) {
          requiredOpts.kind = 'transparent';
        } else {
          throw e;
        }
      }
    }

    const adminAddress = await getAdminAddress(provider, proxyAddress);
    const adminBytecode = await provider.send('eth_getCode', [adminAddress]);

    if (adminBytecode === '0x') {
      // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
      const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
      const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);
      const nextImpl = await deployImpl(hre, ImplFactory, requiredOpts, proxyAddress);
      await proxy.upgradeTo(nextImpl);
    } else {
      // Admin contract: redirect upgrade call through it
      const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
      const admin = AdminFactory.attach(adminAddress);
      const manifestAdmin = await manifest.getAdmin();
      if (admin.address !== manifestAdmin?.address) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
      }
      const nextImpl = await deployImpl(hre, ImplFactory, requiredOpts, proxyAddress);
      await admin.upgrade(proxyAddress, nextImpl);
    }

    return ImplFactory.attach(proxyAddress);
  };
}
