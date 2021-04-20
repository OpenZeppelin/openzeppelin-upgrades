import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract, Signer } from 'ethers';

import {
  Manifest,
  ValidationOptions,
  getAdminAddress,
  withValidationDefaults,
  setProxyKind,
  getCode,
} from '@openzeppelin/upgrades-core';

import { deployImpl, getTransparentUpgradeableProxyFactory, getProxyAdminFactory } from './utils';

export type UpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ValidationOptions,
) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts: ValidationOptions = {}) {
    const { provider } = hre.network;

    await setProxyKind(provider, proxyAddress, opts);

    const upgradeTo = await getUpgrader(proxyAddress, ImplFactory.signer);
    const nextImpl = await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress);
    await upgradeTo(nextImpl);

    return ImplFactory.attach(proxyAddress);
  };

  type Upgrader = (nextImpl: string) => Promise<void>;

  async function getUpgrader(proxyAddress: string, signer: Signer): Promise<Upgrader> {
    const { provider } = hre.network;

    const adminAddress = await getAdminAddress(provider, proxyAddress);
    const adminBytecode = await getCode(provider, adminAddress);

    if (adminBytecode === '0x') {
      // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
      const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, signer);
      const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);

      return nextImpl => proxy.upgradeTo(nextImpl);
    } else {
      // Admin contract: redirect upgrade call through it
      const manifest = await Manifest.forNetwork(provider);
      const AdminFactory = await getProxyAdminFactory(hre, signer);
      const admin = AdminFactory.attach(adminAddress);
      const manifestAdmin = await manifest.getAdmin();

      if (admin.address !== manifestAdmin?.address) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
      }

      return nextImpl => admin.upgrade(proxyAddress, nextImpl);
    }
  }
}
