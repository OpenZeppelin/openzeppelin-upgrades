import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Manifest, ValidationOptions, getAdminAddress, withValidationDefaults, setProxyKind } from '@openzeppelin/upgrades-core';

import { deployImpl, getTransparentUpgradeableProxyFactory, getProxyAdminFactory } from './utils';

export type UpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ValidationOptions,
) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts: ValidationOptions = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    await setProxyKind(provider, proxyAddress, opts);

    const adminAddress = await getAdminAddress(provider, proxyAddress);
    const adminBytecode = await provider.send('eth_getCode', [adminAddress]);

    if (adminBytecode === '0x') {
      // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
      const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
      const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);
      const nextImpl = await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress);
      await proxy.upgradeTo(nextImpl);
    } else {
      // Admin contract: redirect upgrade call through it
      const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
      const admin = AdminFactory.attach(adminAddress);
      const manifestAdmin = await manifest.getAdmin();
      if (admin.address !== manifestAdmin?.address) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
      }
      const nextImpl = await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress);
      await admin.upgrade(proxyAddress, nextImpl);
    }

    return ImplFactory.attach(proxyAddress);
  };
}
