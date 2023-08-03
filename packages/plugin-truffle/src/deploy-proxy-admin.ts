import { fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { wrapProvider, deploy, getProxyAdminFactory, withDefaults, DeployProxyAdminOptions } from './utils';

export async function deployProxyAdmin(opts: DeployProxyAdminOptions = {}): Promise<string> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);

  const AdminFactory = getProxyAdminFactory();
  return await fetchOrDeployAdmin(provider, () => deploy(deployer, opts, AdminFactory));
}
