import { fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { wrapProvider, deploy, getProxyAdminFactory, withDefaults, Options, ContractClass } from './utils';

export async function deployProxyAdmin(template?: ContractClass, opts: Options = {}): Promise<string> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);

  const AdminFactory = getProxyAdminFactory(template);
  return await fetchOrDeployAdmin(provider, () => deploy(deployer, AdminFactory));
}
