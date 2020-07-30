import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import { ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { validateArtifacts } from './validate';
import { deploy } from './utils/deploy';
import { defaultDeployer } from './default-deployer';
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options } from './options';

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer = defaultDeployer } = opts;
  const provider = wrapProvider(deployer.provider);

  const validations = await validateArtifacts(getTruffleConfig().contracts_build_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version);

  const AdminFactory = await getProxyAdminFactory(Contract);
  const admin = new AdminFactory(await getAdminAddress(provider, proxyAddress));

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const manifest = await Manifest.forNetwork(provider);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout);

  const nextImpl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(Contract, deployer);
    return { ...deployment, layout };
  });

  await admin.upgrade(proxyAddress, nextImpl);

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}
