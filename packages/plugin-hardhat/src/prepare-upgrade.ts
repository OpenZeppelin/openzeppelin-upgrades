import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { Options, ContractAddressOrInstance, getContractAddress, deployProxyImpl, deployBeaconImpl } from './utils';
import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  UpgradesError,
  isBeacon,
} from '@openzeppelin/upgrades-core';

export type PrepareUpgradeFunction = (
  proxyOrBeaconAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyOrBeacon, ImplFactory, opts: Options = {}) {
    const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);
    const { provider } = hre.network;
    let deployedImpl;
    if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
      deployedImpl = await deployProxyImpl(hre, ImplFactory, opts, proxyOrBeaconAddress);
    } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
      const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress);
    } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, proxyOrBeaconAddress);
    } else {
      throw new UpgradesError(
        `Contract at address ${proxyOrBeaconAddress} doesn't look like a supported proxy or beacon`,
        () => `Only transparent, UUPS, or beacon proxies or beacons can be used with the prepareUpgrade() function.`,
      );
    }
    return deployedImpl.impl;
  };
}
