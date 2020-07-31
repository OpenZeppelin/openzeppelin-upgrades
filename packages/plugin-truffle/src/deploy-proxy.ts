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
import { getProxyFactory, getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDefaults } from './options';

interface InitializerOptions {
  initializer?: string;
}

export async function deployProxy(
  Contract: ContractClass,
  args: unknown[] = [],
  opts: Options & InitializerOptions = {},
): Promise<ContractInstance> {
  const { deployer } = withDefaults(opts);

  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);

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

  const data = getInitializerData(Contract, args, opts.initializer);
  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, adminAddress, data);

  Contract.address = proxy.address;
  return new Contract(proxy.address);
}

function getInitializerData(Contract: ContractClass, args: unknown[], initializer?: string): string {
  const allowNoInitialization = initializer === undefined && args.length === 0;
  initializer = initializer ?? 'initialize';

  const stub = new Contract('');

  if (initializer in stub.contract.methods) {
    return stub.contract.methods[initializer](...args).encodeABI();
  } else if (allowNoInitialization) {
    return '0x';
  } else {
    throw new Error(`Contract ${Contract.name} does not have a function \`${initializer}\``);
  }
}
