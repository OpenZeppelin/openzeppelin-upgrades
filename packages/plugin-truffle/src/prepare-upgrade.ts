import {
  getBeaconAddress,
  isBeacon,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  PrepareUpgradeUnsupportedError,
} from '@openzeppelin/upgrades-core';
import {
  ContractClass,
  deployProxyImpl,
  Options,
  ContractAddressOrInstance,
  getContractAddress,
  withDefaults,
  wrapProvider,
  deployBeaconImpl,
} from './utils';

export async function prepareUpgrade(
  proxyOrBeacon: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  let deployedImpl;
  if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
    deployedImpl = await deployProxyImpl(Contract, opts, proxyOrBeaconAddress);
  } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
    const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
    deployedImpl = await deployBeaconImpl(Contract, opts, beaconAddress);
  } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
    deployedImpl = await deployBeaconImpl(Contract, opts, proxyOrBeaconAddress);
  } else {
    throw new PrepareUpgradeUnsupportedError(proxyOrBeaconAddress);
  }
  return deployedImpl.impl;
}
