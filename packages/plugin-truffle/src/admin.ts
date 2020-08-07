import { EthereumProvider, getAdminAddress, Manifest } from '@openzeppelin/upgrades-core';

import { ContractInstance } from './truffle';
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

export async function changeProxyAdmin(proxyAddress: string, newAdmin: string, opts: Options): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const admin = await getManifestAdmin(provider);
  const proxyAdminAddress = await getAdminAddress(provider, proxyAddress);

  if (admin.address !== proxyAdminAddress) {
    throw new Error('Proxy admin is not the ProxyAdmin contract registered in the manifesto');
  } else if (admin.address !== newAdmin) {
    await admin.changeProxyAdmin(proxyAddress, newAdmin);
  }
}

export async function transferProxyAdminOwnership(newOwner: string, opts: Options): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const admin = await getManifestAdmin(provider);
  await admin.transferOwnerwhip(newOwner);
}

async function getManifestAdmin(provider: EthereumProvider): Promise<ContractInstance> {
  const manifest = await Manifest.forNetwork(provider);
  const manifestAdmin = await manifest.getAdmin();
  const AdminFactory = getProxyAdminFactory();
  const proxyAdminAddress = manifestAdmin?.address;

  if (proxyAdminAddress === undefined) {
    throw new Error('No ProxyAdmin was found in the manifesto');
  }

  return new AdminFactory(proxyAdminAddress);
}
