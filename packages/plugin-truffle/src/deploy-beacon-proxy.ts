import {
  Manifest,
  logWarning,
  ProxyDeployment,
  getImplementationAddressFromBeacon,
  isBeacon,
  DeployBeaconProxyUnsupportedError,
  DeployBeaconProxyImplUnknownError,
  DeployBeaconProxyKindError,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deploy,
  DeployBeaconProxyOptions,
  withDefaults,
  getContractAddress,
  ContractAddressOrInstance,
  getBeaconProxyFactory,
} from './utils';
import { getInterfaceFromManifest } from './utils/impl-interface';
import { getInitializerData } from './utils/initializer-data';

export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  opts?: DeployBeaconProxyOptions,
): Promise<ContractInstance>;
export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  args?: unknown[],
  opts?: DeployBeaconProxyOptions,
): Promise<ContractInstance>;
export async function deployBeaconProxy(
  beacon: ContractAddressOrInstance,
  args: unknown[] | DeployBeaconProxyOptions = [],
  opts: DeployBeaconProxyOptions = {},
): Promise<ContractInstance> {
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

  let contractInterface: ContractClass | undefined;
  if (opts.implementation !== undefined) {
    contractInterface = opts.implementation;
  } else {
    const implAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
    contractInterface = await getInterfaceFromManifest(provider, implAddress);
    if (contractInterface === undefined) {
      throw new DeployBeaconProxyImplUnknownError(implAddress);
    }
  }

  const data = getInitializerData(contractInterface, args, opts.initializer);

  if (await manifest.getAdmin()) {
    logWarning(`A proxy admin was previously deployed on this network`, [
      `This is not natively used with the current kind of proxy ('beacon').`,
      `Changes to the admin will have no effect on this new proxy.`,
    ]);
  }

  const BeaconProxyFactory = getBeaconProxyFactory(contractInterface);

  const proxyDeployment: Required<ProxyDeployment> = Object.assign(
    { kind: opts.kind },
    await deploy(deployer, BeaconProxyFactory, beaconAddress, data),
  );

  await manifest.addProxy(proxyDeployment);

  contractInterface.address = proxyDeployment.address;
  const contract = new contractInterface(proxyDeployment.address);
  contract.transactionHash = proxyDeployment.txHash;
  return contract;
}
