import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  getContractAddress,
  ContractAddressOrInstance,
  getUpgradeableBeaconFactory,
  deployImplForBeacon,
  Options,
} from './utils';
import { FormatTypes } from '@ethersproject/abi';
import { Manifest } from '@openzeppelin/upgrades-core';

export type UpgradeBeaconFunction = (
  beacon: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<Contract>;

export function makeUpgradeBeacon(hre: HardhatRuntimeEnvironment): UpgradeBeaconFunction {
  return async function upgradeBeacon(beacon, ImplFactory, opts: Options = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const beaconAddress = getContractAddress(beacon);

    const { impl: nextImpl } = await deployImplForBeacon(hre, ImplFactory, opts, beaconAddress);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
    const beaconContract = UpgradeableBeaconFactory.attach(beaconAddress);
    const upgradeTx = await beaconContract.upgradeTo(nextImpl);
    const abi = ImplFactory.interface.format(FormatTypes.json);
    
    const beaconDeployment = {
      address: beaconAddress,
      txHash: upgradeTx.hash,
      abi: abi
    }
    await manifest.addBeacon(beaconDeployment);

    // @ts-ignore Won't be readonly because inst was created through attach.
    beaconContract.deployTransaction = upgradeTx;
    return beaconContract;
  };
}
