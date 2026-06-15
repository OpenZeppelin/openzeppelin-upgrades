import type { ContractInfo, DeployedContract, EngineBinding } from './binding.js';
import { deployBeaconImpl } from './deploy-impl.js';
import { getInitialOwner } from './initial-owner.js';
import { getUpgradeableBeaconContractInfo } from './artifacts.js';
import type { DeployBeaconOptions } from './options.js';

/**
 * Client-neutral orchestration of `deployBeacon`: deploys (or reuses) the implementation and
 * deploys an `UpgradeableBeacon` for it. Returns the beacon deployment record.
 */
export async function deployBeacon(
  binding: EngineBinding,
  implInfo: ContractInfo,
  opts: DeployBeaconOptions,
): Promise<DeployedContract> {
  const { impl } = await deployBeaconImpl(binding, implInfo, opts, undefined);

  const initialOwner = await getInitialOwner(binding, opts);

  return await binding.deploy(getUpgradeableBeaconContractInfo(), [impl, initialOwner]);
}
