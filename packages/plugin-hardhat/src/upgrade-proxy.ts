import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ethers, ContractFactory, Contract, Signer } from 'ethers';

import { Manifest, getAdminAddress, getCode, isEmptySlot } from '@openzeppelin/upgrades-core';

import {
  UpgradeProxyOptions,
  deployProxyImpl,
  getITransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  getContractAddress,
  ContractAddressOrInstance,
  getSigner,
} from './utils';
import { disablePlatform } from './platform/utils';
import { attach } from './utils/ethers';

export type UpgradeFunction = (
  proxy: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: UpgradeProxyOptions,
) => Promise<Contract>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment, platformModule: boolean): UpgradeFunction {
  return async function upgradeProxy(proxy, ImplFactory, opts: UpgradeProxyOptions = {}) {
    disablePlatform(hre, platformModule, opts, upgradeProxy.name);

    const proxyAddress = await getContractAddress(proxy);

    const { impl: nextImpl } = await deployProxyImpl(hre, ImplFactory, opts, proxyAddress);
    // upgrade kind is inferred above
    const upgradeTo = await getUpgrader(proxyAddress, getSigner(ImplFactory.runner));
    const call = encodeCall(ImplFactory, opts.call);
    const upgradeTx = await upgradeTo(nextImpl, call);

    const inst = attach(ImplFactory, proxyAddress);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = upgradeTx;
    return inst;
  };

  type Upgrader = (nextImpl: string, call?: string) => Promise<ethers.TransactionResponse>;

  async function getUpgrader(proxyAddress: string, signer?: Signer): Promise<Upgrader> {
    const { provider } = hre.network;

    const adminAddress = await getAdminAddress(provider, proxyAddress);
    const adminBytecode = await getCode(provider, adminAddress);

    if (isEmptySlot(adminAddress) || adminBytecode === '0x') {
      // No admin contract: use ITransparentUpgradeableProxyFactory to get proxiable interface
      const ITransparentUpgradeableProxyFactory = await getITransparentUpgradeableProxyFactory(hre, signer);
      const proxy = attach(ITransparentUpgradeableProxyFactory, proxyAddress);

      return (nextImpl, call) => (call ? proxy.upgradeToAndCall(nextImpl, call) : proxy.upgradeTo(nextImpl));
    } else {
      // Admin contract: redirect upgrade call through it
      const manifest = await Manifest.forNetwork(provider);
      const AdminFactory = await getProxyAdminFactory(hre, signer);
      const admin = attach(AdminFactory, adminAddress);
      const manifestAdmin = await manifest.getAdmin();

      if ((await admin.getAddress()) !== manifestAdmin?.address) {
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
