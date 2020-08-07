import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract } from 'ethers';
import { getProxyAdminFactory } from './proxy-factory';

type ChangeAdminFunction = (proxyAddress: string, newAdmin: string) => Promise<void>;
type TransferProxyAdminOwnershipFunction = (newOwner: string) => Promise<void>;

export function makeChangeProxyAdmin(bre: BuidlerRuntimeEnvironment): ChangeAdminFunction {
  return async function changeProxyAdmin(proxyAddress, newAdmin) {
    const admin = await getManifestAdmin(bre);
    const proxyAdminAddress = await getAdminAddress(bre.network.provider, proxyAddress);

    if (admin.address !== proxyAdminAddress) {
      throw new Error('Proxy admin is not the ProxyAdmin contract registered in the manifesto');
    } else if (admin.address !== newAdmin) {
      await admin.changeProxyAdmin(proxyAddress, newAdmin);
    }
  };
}

export function makeTransferProxyAdminOwnership(bre: BuidlerRuntimeEnvironment): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(newOwner) {
    const admin = await getManifestAdmin(bre);
    await admin.transferOwnerwhip(newOwner);
  };
}

export async function getManifestAdmin(bre: BuidlerRuntimeEnvironment): Promise<Contract> {
  const manifest = await Manifest.forNetwork(bre.network.provider);
  const manifestAdmin = await manifest.getAdmin();
  const AdminFactory = await getProxyAdminFactory(bre);
  const proxyAdminAddress = manifestAdmin?.address;

  if (proxyAdminAddress === undefined) {
    throw new Error('No ProxyAdmin was found in the manifesto');
  }

  return AdminFactory.attach(proxyAdminAddress);
}
