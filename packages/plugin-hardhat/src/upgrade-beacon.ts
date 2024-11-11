import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  getContractAddress,
  ContractAddressOrInstance,
  getUpgradeableBeaconFactory,
  deployBeaconImpl,
  UpgradeBeaconOptions,
  attach,
  getSigner,
} from './utils';
import { disableDefender } from './defender/utils';
import { ContractTypeOfFactory } from './type-extensions';

export type UpgradeBeaconFunction = <F extends ContractFactory>(
  beacon: ContractAddressOrInstance,
  ImplFactory: F,
  opts?: UpgradeBeaconOptions,
) => Promise<ContractTypeOfFactory<F>>;

export function makeUpgradeBeacon(hre: HardhatRuntimeEnvironment, defenderModule: boolean): UpgradeBeaconFunction {
  return async function upgradeBeacon<F extends ContractFactory>(
    beacon: ContractAddressOrInstance,
    ImplFactory: F,
    opts: UpgradeBeaconOptions = {},
  ): Promise<ContractTypeOfFactory<F>> {
    disableDefender(hre, defenderModule, opts, upgradeBeacon.name);

    const beaconAddress = await getContractAddress(beacon);
    const { impl: nextImpl } = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, getSigner(ImplFactory.runner));
    const beaconContract = attach(UpgradeableBeaconFactory, beaconAddress);

    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    const upgradeTx = await beaconContract.upgradeTo(nextImpl, ...overrides);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = upgradeTx;
    return beaconContract as ContractTypeOfFactory<F>;
  };
}
