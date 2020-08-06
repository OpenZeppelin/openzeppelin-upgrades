import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract } from 'ethers';
import { getProxyAdminFactory } from './proxy-factory';

type ChangeAdminFunction = (proxyAddress: string, newAdmin: string) => Promise<void>;
type TransferOwnershipFunction = (proxyAdminAddress: string, newAdmin: string) => Promise<void>;

export function makeChangeProxyAdmin(bre: BuidlerRuntimeEnvironment): ChangeAdminFunction {
  return async function changeProxyAdmin(proxyAddress, newAdmin) {
    const admin = await getManifestAdmin(bre, await getAdminAddress(bre.network.provider, proxyAddress));

    if (admin.address !== newAdmin) {
      await admin.changeProxyAdmin(proxyAddress, newAdmin);
    }
  };
}

export function makeTransferOwnership(bre: BuidlerRuntimeEnvironment): TransferOwnershipFunction {
  return async function transferOwnership(proxyAdminAddress, newOwner) {
    const admin = await getManifestAdmin(bre, proxyAdminAddress);
    await admin.transferOwnerwhip(newOwner);
  };
}

async function getManifestAdmin(bre: BuidlerRuntimeEnvironment, proxyAdminAddress: string): Promise<Contract> {
  const manifest = await Manifest.forNetwork(bre.network.provider);
  const manifestAdmin = await manifest.getAdmin();
  const AdminFactory = await getProxyAdminFactory(bre);
  const admin = AdminFactory.attach(proxyAdminAddress);

  if (admin.address !== manifestAdmin?.address) {
    throw new Error('Proxy admin is not the registered ProxyAdmin contract');
  }

  return admin;
}
