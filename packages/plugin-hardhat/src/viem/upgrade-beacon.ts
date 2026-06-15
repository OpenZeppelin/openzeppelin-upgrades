import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { upgradeBeacon as engineUpgradeBeacon } from '../engine/upgrade-beacon.js';
import type { UpgradeBeaconOptions } from './options.js';
import { getUpgradeableBeaconContract, UpgradeableBeaconContract } from './upgradeable-beacon.js';
import { ContractAddressOrInstance, getContractAddress, getContractInfo, makeBinding } from './utils.js';

export type UpgradeBeaconFunction = (
  beacon: ContractAddressOrInstance,
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: UpgradeBeaconOptions,
) => Promise<UpgradeableBeaconContract>;

export function makeUpgradeBeacon(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): UpgradeBeaconFunction {
  return async function upgradeBeacon(
    beacon: ContractAddressOrInstance,
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: UpgradeBeaconOptions = {},
  ): Promise<UpgradeableBeaconContract> {
    const beaconAddress = getContractAddress(beacon);

    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    await engineUpgradeBeacon(binding, beaconAddress, implInfo, opts);

    return getUpgradeableBeaconContract(connection, beaconAddress, opts.client);
  };
}
