import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
  EthereumProvider,
} from '@openzeppelin/upgrades-core';

import { ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { validateArtifacts } from './validate';
import { deploy } from './utils/deploy';
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

async function prepareUpgradeImpl(
  provider: EthereumProvider,
  proxyAddress: string,
  Contract: ContractClass,
  opts: Required<Options>,
): Promise<string> {
  const { deployer, unsafeAllowCustomTypes } = opts;

  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version, unsafeAllowCustomTypes);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const manifest = await Manifest.forNetwork(provider);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout, unsafeAllowCustomTypes);

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(Contract, deployer);
    return { ...deployment, layout };
  });
}

export async function prepareUpgrade(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const requiredOpts = withDefaults(opts);
  const { deployer } = requiredOpts;
  const provider = wrapProvider(deployer.provider);

  return await prepareUpgradeImpl(provider, proxyAddress, Contract, requiredOpts);
}

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const requiredOpts = withDefaults(opts);
  const { deployer } = requiredOpts;
  const provider = wrapProvider(deployer.provider);
  const nextImpl = await prepareUpgradeImpl(provider, proxyAddress, Contract, requiredOpts);

  const AdminFactory = getProxyAdminFactory(Contract);
  const admin = new AdminFactory(await getAdminAddress(provider, proxyAddress));

  await admin.upgrade(proxyAddress, nextImpl);

  return new Contract(proxyAddress);
}
