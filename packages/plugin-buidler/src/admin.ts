import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { getProxyAdminFactory } from './proxy-factory';

type ChangeAdminFunction = (proxyAddress: string, newAdmin: string) => Promise<void>;
type TransferOwnershipFunction = (proxyAdminAddress: string, newAdmin: string) => Promise<void>;

export function makeChangeProxyAdmin(bre: BuidlerRuntimeEnvironment): ChangeAdminFunction {
  return async function changeProxyAdmin(proxyAddress, newAdmin) {
    const { provider } = bre.network;
    const manifest = await Manifest.forNetwork(provider);
    const manifestAdmin = await manifest.getAdmin();

    const AdminFactory = await getProxyAdminFactory(bre);
    const admin = AdminFactory.attach(await getAdminAddress(provider, proxyAddress));

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the registered ProxyAdmin contract');
    } else if (manifestAdmin?.address === newAdmin) {
      throw new Error('Attempted to change Proxy adminship to the current ProxyAdmin');
    }

    await admin.changeProxyAdmin(proxyAddress, newAdmin);
  };
}

export function makeTransferOwnership(bre: BuidlerRuntimeEnvironment): TransferOwnershipFunction {
  return async function transferOwnership(proxyAdminAddress, newOwner) {
    const AdminFactory = await getProxyAdminFactory(bre);
    const admin = AdminFactory.attach(proxyAdminAddress);

    await admin.transferOwnerwhip(newOwner);
  };
}
