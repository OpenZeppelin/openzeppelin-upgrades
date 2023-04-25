import {
  getBeaconAddress,
  isBeacon,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  PrepareUpgradeRequiresKindError,
} from '@openzeppelin/upgrades-core';
import {
  ContractClass,
  deployProxyImpl,
  ContractAddressOrInstance,
  getContractAddress,
  withDefaults,
  wrapProvider,
  deployBeaconImpl,
  PrepareUpgradeOptions,
  deployUpgradeableImpl,
} from './utils';

export async function prepareUpgrade(
  from: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: PrepareUpgradeOptions = {},
): Promise<string> {
  const fromAddr = getContractAddress(from);
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  let deployedImpl;
  if (await isTransparentOrUUPSProxy(provider, fromAddr)) {
    deployedImpl = await deployProxyImpl(Contract, opts, fromAddr);
  } else if (await isBeaconProxy(provider, fromAddr)) {
    const beaconAddress = await getBeaconAddress(provider, fromAddr);
    deployedImpl = await deployBeaconImpl(Contract, opts, beaconAddress);
  } else if (await isBeacon(provider, fromAddr)) {
    deployedImpl = await deployBeaconImpl(Contract, opts, fromAddr);
  } else {
    if (opts.kind === undefined) {
      throw new PrepareUpgradeRequiresKindError();
    }
    deployedImpl = await deployUpgradeableImpl(Contract, opts, fromAddr);
  }
  return deployedImpl.impl;
}
