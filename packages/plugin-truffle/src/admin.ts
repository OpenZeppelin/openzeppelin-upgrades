import chalk from 'chalk';
import { EthereumProvider, getAdminAddress, Manifest } from '@openzeppelin/upgrades-core';
import { ContractInstance, getProxyAdminFactory, wrapProvider, UpgradeOptions, withDefaults } from './utils';

const SUCCESS_CHECK = chalk.green('✔') + ' ';
const FAILURE_CROSS = chalk.red('✘') + ' ';

async function changeProxyAdmin(proxyAddress: string, newAdmin: string, opts: UpgradeOptions = {}): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const proxyAdminAddress = await getAdminAddress(provider, proxyAddress);

  if (proxyAdminAddress !== newAdmin) {
    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    const AdminFactory = getProxyAdminFactory();
    const admin = new AdminFactory(proxyAdminAddress);
    await admin.changeProxyAdmin(proxyAddress, newAdmin, ...overrides);
  }
}

async function transferProxyAdminOwnership(newOwner: string, opts: UpgradeOptions = {}): Promise<void> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const admin = await getManifestAdmin(provider);

  const overrides = opts.txOverrides ? [opts.txOverrides] : [];
  await admin.transferOwnership(newOwner, ...overrides);

  const manifest = await Manifest.forNetwork(provider);
  const { proxies } = await manifest.read();
  for (const { address, kind } of proxies) {
    if (admin.address == (await getAdminAddress(provider, address))) {
      console.log(SUCCESS_CHECK + `${address} (${kind}) proxy ownership transfered through admin proxy`);
    } else {
      console.log(FAILURE_CROSS + `${address} (${kind}) proxy ownership not affected by admin proxy`);
    }
  }
}

async function getInstance(opts: UpgradeOptions = {}): Promise<ContractInstance> {
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
