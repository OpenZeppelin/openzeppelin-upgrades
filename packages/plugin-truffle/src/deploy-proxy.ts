import {
  assertUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
} from '@openzeppelin/upgrades-core';

import { ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { validateArtifacts, getLinkedBytecode } from './validate';
import { deploy } from './utils/deploy';
import { getProxyFactory, getProxyAdminFactory } from './factories';
import { wrapProvider } from './wrap-provider';
import { Options, withDeployDefaults } from './options';

interface InitializerOptions {
  initializer?: string | false;
}

export async function deployProxy(
  Contract: ContractClass,
  opts?: Options & InitializerOptions,
): Promise<ContractInstance>;

export async function deployProxy(
  Contract: ContractClass,
  args?: unknown[],
  opts?: Options & InitializerOptions,
): Promise<ContractInstance>;

export async function deployProxy(
  Contract: ContractClass,
  args: unknown[] | (Options & InitializerOptions) = [],
  opts: Options & InitializerOptions = {},
): Promise<ContractInstance> {
  if (!Array.isArray(args)) {
    opts = args;
    args = [];
  }

  const { deployer } = withDeployDefaults(opts);
  const provider = wrapProvider(deployer.provider);

  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);

  const linkedBytecode: string = await getLinkedBytecode(Contract, provider);
  const version = getVersion(Contract.bytecode, linkedBytecode);
  assertUpgradeSafe([validations], version, opts);

  const impl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(Contract, deployer);
    const layout = getStorageLayout([validations], version);
    return { ...deployment, layout };
  });

  const AdminFactory = getProxyAdminFactory(Contract);
  const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory, deployer));

  const data = getInitializerData(Contract, args, opts.initializer);
  const AdminUpgradeabilityProxy = getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, adminAddress, data);

  Contract.address = proxy.address;

  const contract = new Contract(proxy.address);
  contract.transactionHash = proxy.transactionHash;
  return contract;
}

function getInitializerData(Contract: ContractClass, args: unknown[], initializer?: string | false): string {
  if (initializer === false) {
    return '0x';
  }

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
