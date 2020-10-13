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
import { validateArtifacts, getLinkedBytecode } from './validate';
import { deploy } from './utils/deploy';
import { getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

async function prepareUpgradeImpl(
  provider: EthereumProvider,
  manifest: Manifest,
  proxyAddress: string,
  Contract: ContractClass,
  opts: Required<Options>,
): Promise<string> {
  const { deployer, unsafeAllowCustomTypes } = opts;

  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);

  const linkedBytecode: string = await getLinkedBytecode(Contract, provider);
  const version = getVersion(Contract.bytecode, linkedBytecode);
  assertUpgradeSafe(validations, version, opts);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
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
  const manifest = await Manifest.forNetwork(provider);

  return await prepareUpgradeImpl(provider, manifest, proxyAddress, Contract, requiredOpts);
}

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const requiredOpts = withDefaults(opts);
  const { deployer } = requiredOpts;
  const provider = wrapProvider(deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  const AdminFactory = getProxyAdminFactory(Contract);
  const admin = new AdminFactory(await getAdminAddress(provider, proxyAddress));
  const manifestAdmin = await manifest.getAdmin();

  if (admin.address !== manifestAdmin?.address) {
    throw new Error('Proxy admin is not the one registered in the network manifest');
  }

  const nextImpl = await prepareUpgradeImpl(provider, manifest, proxyAddress, Contract, requiredOpts);
  await admin.upgrade(proxyAddress, nextImpl);

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}
