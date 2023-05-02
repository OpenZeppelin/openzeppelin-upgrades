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
  referenceAddressOrContract: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: PrepareUpgradeOptions = {},
): Promise<string> {
  const referenceAddress = getContractAddress(referenceAddressOrContract);
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);
  let deployedImpl;
  if (await isTransparentOrUUPSProxy(provider, referenceAddress)) {
    deployedImpl = await deployProxyImpl(Contract, opts, referenceAddress);
  } else if (await isBeaconProxy(provider, referenceAddress)) {
    const beaconAddress = await getBeaconAddress(provider, referenceAddress);
    deployedImpl = await deployBeaconImpl(Contract, opts, beaconAddress);
  } else if (await isBeacon(provider, referenceAddress)) {
    deployedImpl = await deployBeaconImpl(Contract, opts, referenceAddress);
  } else {
    if (opts.kind === undefined) {
      throw new PrepareUpgradeRequiresKindError();
    }
    deployedImpl = await deployUpgradeableImpl(Contract, opts, referenceAddress);
  }
  return deployedImpl.impl;
}
