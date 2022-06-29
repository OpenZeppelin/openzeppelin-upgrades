import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ethers, ContractFactory, Contract, Signer } from 'ethers';

import { Manifest, getAdminAddress, getCode, isEmptySlot } from '@openzeppelin/upgrades-core';

import {
  UpgradeProxyOptions,
  deployProxyImpl,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  getContractAddress,
  ContractAddressOrInstance,
} from './utils';

export type UpgradeFunction = (
  proxy: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: UpgradeProxyOptions,
) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxy, ImplFactory, opts: UpgradeProxyOptions = {}) {
    const proxyAddress = getContractAddress(proxy);

    const { impl: nextImpl } = await deployProxyImpl(hre, ImplFactory, opts, proxyAddress);
    // upgrade kind is inferred above
    const upgradeTo = await getUpgrader(proxyAddress, ImplFactory.signer);
    const call = encodeCall(ImplFactory, opts.call);
    const upgradeTx = await upgradeTo(nextImpl, call);

    const inst = ImplFactory.attach(proxyAddress);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = upgradeTx;
    return inst;
  };

  type Upgrader = (nextImpl: string, call?: string) => Promise<ethers.providers.TransactionResponse>;

  async function getUpgrader(proxyAddress: string, signer: Signer): Promise<Upgrader> {
    const { provider } = hre.network;

    const adminAddress = await getAdminAddress(provider, proxyAddress);
    const adminBytecode = await getCode(provider, adminAddress);

    if (isEmptySlot(adminAddress) || adminBytecode === '0x') {
      // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
      const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, signer);
      const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);

      return (nextImpl, call) => (call ? proxy.upgradeToAndCall(nextImpl, call) : proxy.upgradeTo(nextImpl));
    } else {
      // Admin contract: redirect upgrade call through it
      const manifest = await Manifest.forNetwork(provider);
      const AdminFactory = await getProxyAdminFactory(hre, signer);
      const admin = AdminFactory.attach(adminAddress);
      const manifestAdmin = await manifest.getAdmin();

      if (admin.address !== manifestAdmin?.address) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
      }

      return (nextImpl, call) =>
        call ? admin.upgradeAndCall(proxyAddress, nextImpl, call) : admin.upgrade(proxyAddress, nextImpl);
    }
  }
}

function encodeCall(factory: ContractFactory, call: UpgradeProxyOptions['call']): string | undefined {
  if (!call) {
    return undefined;
  }

  if (typeof call === 'string') {
    call = { fn: call };
  }

  return factory.interface.encodeFunctionData(call.fn, call.args ?? []);
}
