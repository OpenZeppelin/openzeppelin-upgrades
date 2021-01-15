import { EthereumProvider, getAdminAddress, Manifest } from '@openzeppelin/upgrades-core';

import { ContractInstance } from './truffle';
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

async function changeProxyAdmin(proxyAddress: string, newAdmin: string, opts: Options = {}): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const admin = await getManifestAdmin(provider);
  const proxyAdminAddress = await getAdminAddress(provider, proxyAddress);

  if (admin.address !== proxyAdminAddress) {
    throw new Error('Proxy admin is not the one registered in the network manifest');
  } else if (admin.address !== newAdmin) {
    await admin.changeProxyAdmin(proxyAddress, newAdmin);
  }
}

async function transferProxyAdminOwnership(newOwner: string, opts: Options = {}): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const admin = await getManifestAdmin(provider);
  await admin.transferOwnership(newOwner);
}

async function getInstance(opts: Options = {}): Promise<ContractInstance> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  return await getManifestAdmin(provider);
}

export async function getManifestAdmin(provider: EthereumProvider): Promise<ContractInstance> {
  const manifest = await Manifest.forNetwork(provider);
  const manifestAdmin = await manifest.getAdmin();
  const AdminFactory = getProxyAdminFactory();
  const proxyAdminAddress = manifestAdmin?.address;

  if (proxyAdminAddress === undefined) {
    throw new Error('No ProxyAdmin was found in the network manifest');
  }

  return new AdminFactory(proxyAdminAddress);
}

export const admin = {
  getInstance,
  transferProxyAdminOwnership,
  changeProxyAdmin,
};
