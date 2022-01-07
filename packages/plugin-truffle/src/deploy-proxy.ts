import {
  Manifest,
  fetchOrDeployAdmin,
  logWarning,
  ProxyDeployment,
  BeaconProxyUnsupportedError,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deploy,
  deployProxyImpl,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  DeployProxyOptions,
  withDefaults,
} from './utils';
import { getInitializerData } from './utils/initializer-data';

export async function deployProxy(Contract: ContractClass, opts?: DeployProxyOptions): Promise<ContractInstance>;
export async function deployProxy(
  Contract: ContractClass,
  args?: unknown[],
  opts?: DeployProxyOptions,
): Promise<ContractInstance>;
export async function deployProxy(
  Contract: ContractClass,
  args: unknown[] | DeployProxyOptions = [],
  opts: DeployProxyOptions = {},
): Promise<ContractInstance> {
  if (!Array.isArray(args)) {
    opts = args;
    args = [];
  }
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  const { impl, kind } = await deployProxyImpl(Contract, opts);
  const data = getInitializerData(Contract, args, opts.initializer);

  if (kind === 'uups') {
    if (await manifest.getAdmin()) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('uups').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    }
  }

  let proxyDeployment: Required<ProxyDeployment>;
  switch (kind) {
    case 'beacon': {
      throw new BeaconProxyUnsupportedError();
    }

    case 'uups': {
      const ProxyFactory = getProxyFactory(Contract);
      proxyDeployment = Object.assign({ kind }, await deploy(deployer, ProxyFactory, impl, data));
      break;
    }

    case 'transparent': {
      const AdminFactory = getProxyAdminFactory(Contract);
      const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(deployer, AdminFactory));
      const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
      proxyDeployment = Object.assign(
        { kind },
        await deploy(deployer, TransparentUpgradeableProxyFactory, impl, adminAddress, data),
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
