import { Manifest, fetchOrDeployAdmin, logWarning, ProxyDeployment } from '@openzeppelin/upgrades-core';

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
  const { kind } = requiredOpts;

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  if (kind === 'uups') {
    if (await manifest.getAdmin()) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('uups').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    }
  }

  const impl = await deployImpl(Contract, requiredOpts);
  const data = getInitializerData(Contract, args, opts.initializer);

  let proxyDeployment: Required<ProxyDeployment>;
  switch (kind) {
    case 'uups': {
      const ProxyFactory = getProxyFactory(Contract);
      proxyDeployment = Object.assign({ kind }, await deploy(requiredOpts.deployer, ProxyFactory, impl, data));
      break;
    }

    case 'transparent': {
      const AdminFactory = getProxyAdminFactory(Contract);
      const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(requiredOpts.deployer, AdminFactory));
      const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
      proxyDeployment = Object.assign(
        { kind },
        await deploy(requiredOpts.deployer, TransparentUpgradeableProxyFactory, impl, adminAddress, data),
      );
      break;
    }
  }

  await manifest.addProxy(proxyDeployment);

  Contract.address = proxyDeployment.address;
  const contract = new Contract(proxyDeployment.address);
  contract.transactionHash = proxyDeployment.txHash;
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
