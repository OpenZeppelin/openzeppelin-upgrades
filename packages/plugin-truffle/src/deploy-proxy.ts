import {
  fetchOrDeployAdmin,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deploy,
  deployImpl,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  Options,
  withDefaults,
} from './utils';

export async function deployProxy(
  Contract: ContractClass,
  opts?: Options,
): Promise<ContractInstance>;

export async function deployProxy(
  Contract: ContractClass,
  args?: unknown[],
  opts?: Options,
): Promise<ContractInstance>;

export async function deployProxy(
  Contract: ContractClass,
  args: unknown[] | (Options) = [],
  opts: Options = {},
): Promise<ContractInstance> {
  if (!Array.isArray(args)) {
    opts = args;
    args = [];
  }
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const impl = await deployImpl(Contract, requiredOpts);
  const data = getInitializerData(Contract, args, requiredOpts.initializer);

  let proxy: ContractInstance;
  switch (requiredOpts.kind) {
    case 'auto':
    case 'uups':
      const ProxyFactory = getProxyFactory(Contract);
      proxy = await requiredOpts.deployer.deploy(ProxyFactory, impl, data);
      break;

    case 'transparent':
      const AdminFactory = getProxyAdminFactory(Contract);
      const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory, requiredOpts.deployer));
      const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
      proxy = await requiredOpts.deployer.deploy(TransparentUpgradeableProxyFactory, impl, adminAddress, data);
      break;
  }

  Contract.address = proxy.address;
  const contract = new Contract(proxy.address);
  contract.transactionHash = proxy.transactionHash;
  return contract;
}

function getInitializerData(Contract: ContractClass, args: unknown[], initializer: string | false): string {
  if (initializer === false) {
    return '0x';
  }

  const stub = new Contract('');
  if (initializer in stub.contract.methods) {
    return stub.contract.methods[initializer](...args).encodeABI();
  } else if (initializer === 'initialize' && args.length === 0) {
    return '0x';
  } else {
    throw new Error(`Contract ${Contract.name} does not have a function \`${initializer}\``);
  }
}
