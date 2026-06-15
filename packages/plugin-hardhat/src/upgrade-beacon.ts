import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, Contract, TransactionResponse } from 'ethers';

import {
  getContractAddress,
  ContractAddressOrInstance,
  getUpgradeableBeaconFactory,
  UpgradeBeaconOptions,
  attach,
  getSigner,
} from './utils/index.js';
import { disableDefender } from './defender/utils.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { upgradeBeacon as engineUpgradeBeacon } from './engine/upgrade-beacon.js';

export type UpgradeBeaconFunction = (
  beacon: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: UpgradeBeaconOptions,
) => Promise<Contract>;

export function makeUpgradeBeacon(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): UpgradeBeaconFunction {
  return async function upgradeBeacon(beacon, ImplFactory, opts: UpgradeBeaconOptions = {}) {
    disableDefender(hre, defenderModule, opts, upgradeBeacon.name);

    const beaconAddress = await getContractAddress(beacon);

    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const { sent } = await engineUpgradeBeacon(binding, beaconAddress, contractInfo(ImplFactory), opts);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(connection, getSigner(ImplFactory.runner));
    const beaconContract = attach(UpgradeableBeaconFactory, beaconAddress);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = sent.txResponse as TransactionResponse | undefined;
    return beaconContract;
  };
}
