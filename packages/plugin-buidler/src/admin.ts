import type { BuidlerRuntimeEnvironment, EthereumProvider } from '@nomiclabs/buidler/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract } from 'ethers';
import { getProxyAdminFactory } from './proxy-factory';

type ChangeAdminFunction = (proxyAddress: string, newAdmin: string) => Promise<void>;
type TransferOwnershipFunction = (proxyAdminAddress: string, newAdmin: string) => Promise<void>;

export function makeChangeProxyAdmin(bre: BuidlerRuntimeEnvironment): ChangeAdminFunction {
  return async function changeProxyAdmin(proxyAddress, newAdmin) {
    const { provider } = bre.network;

    const manifestAdminAddress = await getManifestAdminAddress(provider);
    const admin = await getAdmin(bre, await getAdminAddress(provider, proxyAddress));

    if (admin.address !== manifestAdminAddress) {
      throw new Error('Proxy admin is not the registered ProxyAdmin contract');
    } else if (admin.address === newAdmin) {
      throw new Error('Cannot change Proxy adminship to the same admin');
    }

    await admin.changeProxyAdmin(proxyAddress, newAdmin);
  };
}

export function makeTransferOwnership(bre: BuidlerRuntimeEnvironment): TransferOwnershipFunction {
  return async function transferOwnership(proxyAdminAddress, newOwner) {
    const manifestAdminAddress = await getManifestAdminAddress(bre.network.provider);
    const admin = await getAdmin(bre, proxyAdminAddress);

    if (admin.address !== manifestAdminAddress) {
      throw new Error('Proxy admin is not the registered ProxyAdmin contract');
    }

    await admin.transferOwnerwhip(newOwner);
  };
}

async function getManifestAdminAddress(provider: EthereumProvider): Promise<string | undefined> {
  const manifest = await Manifest.forNetwork(provider);
  const manifestAdmin = await manifest.getAdmin();
  return manifestAdmin?.address;
}

async function getAdmin(bre: BuidlerRuntimeEnvironment, proxyAdminAddress: string): Promise<Contract> {
  const AdminFactory = await getProxyAdminFactory(bre);
  return AdminFactory.attach(proxyAdminAddress);
}
