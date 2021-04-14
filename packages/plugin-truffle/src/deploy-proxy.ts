import chalk from 'chalk';
import { Manifest, fetchOrDeployProxy, fetchOrDeployAdmin, logWarning } from '@openzeppelin/upgrades-core';

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

interface DeployOptions extends Options {
  initializer?: string | false;
}

export async function deployProxy(Contract: ContractClass, opts?: Options): Promise<ContractInstance>;
export async function deployProxy(Contract: ContractClass, args?: unknown[], opts?: Options): Promise<ContractInstance>;
export async function deployProxy(
  Contract: ContractClass,
  args: unknown[] | Options = [],
  opts: DeployOptions = {},
): Promise<ContractInstance> {
  if (!Array.isArray(args)) {
    opts = args;
    args = [];
  }
  const requiredOpts = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const manifest = await Manifest.forNetwork(provider);
  const impl = await deployImpl(Contract, requiredOpts);
  const data = getInitializerData(Contract, args, opts.initializer);

  if (requiredOpts.kind === 'uups' && (await manifest.getAdmin())) {
    logWarning(`A proxy admin was previously deployed on this network`, [
      `This is not natively used with the current kind of proxy ('uups').`,
      `Changes to the admin will have no affect on this new proxy.`,
    ]);
  }

  let proxyAddress: string;
  switch (requiredOpts.kind) {
    case 'uups': {
      const ProxyFactory = getProxyFactory(Contract);
      proxyAddress = await fetchOrDeployProxy(provider, 'uups', () =>
        deploy(requiredOpts.deployer, ProxyFactory, impl, data),
      );
      break;
    }

    case 'auto':
    case 'transparent': {
      const AdminFactory = getProxyAdminFactory(Contract);
      const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(requiredOpts.deployer, AdminFactory));
      const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
      proxyAddress = await fetchOrDeployProxy(provider, 'transparent', () =>
        deploy(requiredOpts.deployer, TransparentUpgradeableProxyFactory, impl, adminAddress, data),
      );
      break;
    }
  }

  const { txHash } = await manifest.getProxyFromAddress(proxyAddress);

  Contract.address = proxyAddress;
  const contract = new Contract(proxyAddress);
  contract.transactionHash = txHash;
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
