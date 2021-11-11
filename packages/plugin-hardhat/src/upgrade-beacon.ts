import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  getContractAddress,
  ContractAddressOrInstance,
  getUpgradeableBeaconFactory,
  deployBeaconImpl,
  Options,
} from './utils';

export type UpgradeBeaconFunction = (
  beacon: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<Contract>;

export function makeUpgradeBeacon(hre: HardhatRuntimeEnvironment): UpgradeBeaconFunction {
  return async function upgradeBeacon(beacon, ImplFactory, opts: Options = {}) {
    const beaconAddress = getContractAddress(beacon);
    const { impl: nextImpl } = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
    const beaconContract = UpgradeableBeaconFactory.attach(beaconAddress);
    const upgradeTx = await beaconContract.upgradeTo(nextImpl);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = upgradeTx;
    return beaconContract;
  };
}
