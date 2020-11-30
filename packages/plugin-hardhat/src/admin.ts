import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract } from 'ethers';
import { getProxyAdminFactory } from './proxy-factory';

export type ChangeAdminFunction = (proxyAddress: string, newAdmin: string) => Promise<void>;
export type TransferProxyAdminOwnershipFunction = (newOwner: string) => Promise<void>;

export function makeChangeProxyAdmin(hre: HardhatRuntimeEnvironment): ChangeAdminFunction {
  return async function changeProxyAdmin(proxyAddress, newAdmin) {
    const admin = await getManifestAdmin(hre);
    const proxyAdminAddress = await getAdminAddress(hre.network.provider, proxyAddress);

    if (admin.address !== proxyAdminAddress) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    } else if (admin.address !== newAdmin) {
      await admin.changeProxyAdmin(proxyAddress, newAdmin);
    }
  };
}

export function makeTransferProxyAdminOwnership(hre: HardhatRuntimeEnvironment): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(newOwner) {
    const admin = await getManifestAdmin(hre);
    await admin.transferOwnership(newOwner);
  };
}

export async function getManifestAdmin(hre: HardhatRuntimeEnvironment): Promise<Contract> {
  const manifest = await Manifest.forNetwork(hre.network.provider);
  const manifestAdmin = await manifest.getAdmin();
  const proxyAdminAddress = manifestAdmin?.address;

  if (proxyAdminAddress === undefined) {
    throw new Error('No ProxyAdmin was found in the network manifest');
  }

  const AdminFactory = await getProxyAdminFactory(hre);
  return AdminFactory.attach(proxyAdminAddress);
}
