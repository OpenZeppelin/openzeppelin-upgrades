import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { makeUpgradeBeacon as makeEthersUpgradeBeacon } from '../upgrade-beacon.js';
import type { UpgradeBeaconOptions as EthersUpgradeBeaconOptions } from '../utils/options.js';
import type { UpgradeBeaconOptions } from './options.js';
import { getUpgradeableBeaconContract, UpgradeableBeaconContract } from './upgradeable-beacon.js';
import {
  ContractAddressOrInstance,
  getContractAddress,
  getContractFactory,
  toEthersOptions,
  waitForAttachedTransaction,
} from './utils.js';

export type UpgradeBeaconFunction = (
  beacon: ContractAddressOrInstance,
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: UpgradeBeaconOptions,
) => Promise<UpgradeableBeaconContract>;

export function makeUpgradeBeacon(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): UpgradeBeaconFunction {
  const ethersUpgradeBeacon = makeEthersUpgradeBeacon(hre, false, connection);

  return async function upgradeBeacon(
    beacon: ContractAddressOrInstance,
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: UpgradeBeaconOptions = {},
  ): Promise<UpgradeableBeaconContract> {
    const beaconAddress = getContractAddress(beacon);

    const factory = await getContractFactory(connection, contractName, opts);
    const upgraded = await ethersUpgradeBeacon(
      beaconAddress,
      factory,
      toEthersOptions<EthersUpgradeBeaconOptions>(opts),
    );
    await waitForAttachedTransaction(upgraded);

    return getUpgradeableBeaconContract(connection, beaconAddress, opts.client);
  };
}
