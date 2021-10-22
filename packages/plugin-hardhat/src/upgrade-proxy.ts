import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ethers, ContractFactory, Contract, Signer } from 'ethers';

import { Manifest, getAdminAddress, getCode } from '@openzeppelin/upgrades-core';

import {
  Options,
  deployImpl,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  getContractAddress,
  ContractAddressOrInstance,
} from './utils';

export type UpgradeFunction = (
  proxy: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxy, ImplFactory, opts: Options = {}) {
    const proxyAddress = getContractAddress(proxy);

    const upgradeTo = await getUpgrader(proxyAddress, ImplFactory.signer);
    const { impl: nextImpl } = await deployImpl(hre, ImplFactory, opts, proxyAddress);
    const upgradeTx = await upgradeTo(nextImpl);

    const inst = ImplFactory.attach(proxyAddress);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = upgradeTx;
    return inst;
  };

  type Upgrader = (nextImpl: string) => Promise<ethers.providers.TransactionResponse>;

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
