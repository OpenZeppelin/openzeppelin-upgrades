import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
} from '@openzeppelin/upgrades-core';

import { ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { validateArtifacts } from './validate';
import { deploy } from './utils/deploy';
import { defaultDeployer } from './default-deployer';
import { getProxyFactory, getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options } from './options';

export async function deployProxy(
  Contract: ContractClass,
  args: unknown[],
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer = defaultDeployer } = opts;

  const validations = await validateArtifacts(getTruffleConfig().contracts_build_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version);

  const provider = wrapProvider(deployer.provider);
  const impl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(Contract, deployer);
    const layout = getStorageLayout(validations, version);
    return { ...deployment, layout };
  });

  const AdminFactory = await getProxyAdminFactory(Contract);
  const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory, deployer));

  const data = await new Contract('').contract.methods.initialize(...args).encodeABI();
  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, adminAddress, data);

  Contract.address = proxy.address;
  return new Contract(proxy.address);
}
