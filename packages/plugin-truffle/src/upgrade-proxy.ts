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
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer, unsafeAllowCustomTypes } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);

  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version, unsafeAllowCustomTypes);

  const AdminFactory = getProxyAdminFactory(Contract);
  const admin = new AdminFactory(await getAdminAddress(provider, proxyAddress));

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const manifest = await Manifest.forNetwork(provider);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout, unsafeAllowCustomTypes);

  const nextImpl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(Contract, deployer);
    return { ...deployment, layout };
  });

  await admin.upgrade(proxyAddress, nextImpl);

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}
