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

    // Autodetect proxy type
    const adminAddress = await getAdminAddress(provider, proxyAddress);
    if (requiredOpts.kind === 'auto') {
      requiredOpts.kind = adminAddress === '0x0000000000000000000000000000000000000000' ? 'uups' : 'transparent';
    }

    switch (requiredOpts.kind) {
      case 'uups': {
        // Use TransparentUpgradeableProxyFactory to get proxiable interface
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);
        const nextImpl = await deployImpl(hre, ImplFactory, requiredOpts, { proxyAddress, manifest });
        await proxy.upgradeTo(nextImpl);
        break;
      }

      case 'transparent': {
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const admin = AdminFactory.attach(adminAddress);
        const manifestAdmin = await manifest.getAdmin();
        if (admin.address !== manifestAdmin?.address) {
          throw new Error('Proxy admin is not the one registered in the network manifest');
        }
        const nextImpl = await deployImpl(hre, ImplFactory, requiredOpts, { proxyAddress, manifest });
        await admin.upgrade(proxyAddress, nextImpl);
        break;
      }
    }

    return ImplFactory.attach(proxyAddress);
  };
}
