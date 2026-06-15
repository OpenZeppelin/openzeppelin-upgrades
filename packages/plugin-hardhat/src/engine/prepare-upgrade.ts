import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  PrepareUpgradeRequiresKindError,
} from '@openzeppelin/upgrades-core';

import type { ContractInfo, EngineBinding } from './binding.js';
import { deployProxyImpl, deployBeaconImpl, deployUpgradeableImpl, DeployedImpl } from './deploy-impl.js';
import type { PrepareUpgradeOptions } from './options.js';

/**
 * Client-neutral orchestration of `prepareUpgrade` (and the implementation deployment used by
 * `prepareUpgrade`): deploys (or reuses) the new implementation for the given reference, inferring
 * the proxy/beacon kind from the reference's on-chain shape.
 */
export async function deployImplForUpgrade(
  binding: EngineBinding,
  referenceAddress: string,
  implInfo: ContractInfo,
  opts: PrepareUpgradeOptions,
): Promise<DeployedImpl> {
  const provider = binding.provider;

  let deployedImpl: DeployedImpl;
  if (await isTransparentOrUUPSProxy(provider, referenceAddress)) {
    deployedImpl = await deployProxyImpl(binding, implInfo, opts, referenceAddress);
  } else if (await isBeaconProxy(provider, referenceAddress)) {
    const beaconAddress = await getBeaconAddress(provider, referenceAddress);
    deployedImpl = await deployBeaconImpl(binding, implInfo, opts, beaconAddress);
  } else if (await isBeacon(provider, referenceAddress)) {
    deployedImpl = await deployBeaconImpl(binding, implInfo, opts, referenceAddress);
  } else {
    if (opts.kind === undefined) {
      throw new PrepareUpgradeRequiresKindError();
    }
    deployedImpl = await deployUpgradeableImpl(binding, implInfo, opts, referenceAddress);
  }
  return deployedImpl;
}
