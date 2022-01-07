import {
  Manifest,
  logWarning,
  ProxyDeployment,
  isBeacon,
  DeployBeaconProxyUnsupportedError,
  DeployBeaconProxyKindError,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deploy,
  withDefaults,
  getContractAddress,
  ContractAddressOrInstance,
  getBeaconProxyFactory,
  DeployProxyOptions,
} from './utils';
import { getInitializerData } from './utils/initializer-data';

export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  attachTo: ContractClass,
  opts?: DeployProxyOptions,
): Promise<ContractInstance>;
export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  attachTo: ContractClass,
  args?: unknown[],
  opts?: DeployProxyOptions,
): Promise<ContractInstance>;
export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  attachTo: ContractClass,
  args: unknown[] | DeployProxyOptions = [],
  opts: DeployProxyOptions = {},
): Promise<ContractInstance> {
  // infer attachTo's interface
  if (attachTo === undefined || !('bytecode' in attachTo)) {
    throw new UpgradesError(
      `attachTo must specify a contract abstraction`,
      () => `Include the contract abstraction for the beacon's current implementation in the attachTo parameter`,
    );
  }
  if (!Array.isArray(args)) {
    opts = args;
    args = [];
  }
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  if (opts.kind !== undefined && opts.kind !== 'beacon') {
    throw new DeployBeaconProxyKindError(opts.kind);
  }
  opts.kind = 'beacon';

  const beaconAddress = getContractAddress(beacon);
  if (!(await isBeacon(provider, beaconAddress))) {
    throw new DeployBeaconProxyUnsupportedError(beaconAddress);
  }

  const data = getInitializerData(attachTo, args, opts.initializer);

  if (await manifest.getAdmin()) {
    logWarning(`A proxy admin was previously deployed on this network`, [
      `This is not natively used with the current kind of proxy ('beacon').`,
      `Changes to the admin will have no effect on this new proxy.`,
    ]);
  }

  const BeaconProxyFactory = getBeaconProxyFactory(attachTo);

  const proxyDeployment: Required<ProxyDeployment> = Object.assign(
    { kind: opts.kind },
    await deploy(deployer, BeaconProxyFactory, beaconAddress, data),
  );

  await manifest.addProxy(proxyDeployment);

  attachTo.address = proxyDeployment.address;
  const contract = new attachTo(proxyDeployment.address);
  contract.transactionHash = proxyDeployment.txHash;
  return contract;
}
