import type { ContractInfo, EngineBinding, SentTransaction } from './binding.js';
import { deployBeaconImpl } from './deploy-impl.js';
import { upgradeableBeaconAbi } from './artifacts.js';
import type { UpgradeBeaconOptions } from './options.js';

export interface UpgradeBeaconResult {
  beaconAddress: string;
  sent: SentTransaction;
}

/**
 * Client-neutral orchestration of `upgradeBeacon`: deploys (or reuses) the new implementation and
 * sends `upgradeTo` to the beacon.
 */
export async function upgradeBeacon(
  binding: EngineBinding,
  beaconAddress: string,
  implInfo: ContractInfo,
  opts: UpgradeBeaconOptions,
): Promise<UpgradeBeaconResult> {
  const { impl: nextImpl } = await deployBeaconImpl(binding, implInfo, opts, beaconAddress);

  const sent = await binding.sendTransaction({
    to: beaconAddress,
    data: binding.encodeFunctionData(upgradeableBeaconAbi, 'upgradeTo', [nextImpl]),
  });

  return { beaconAddress, sent };
}
