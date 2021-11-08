import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { Options, ContractAddressOrInstance, deployImpl, getContractAddress } from './utils';
import { isBeaconProxy } from '@openzeppelin/upgrades-core/dist/validate/query';
import { getBeaconAddress } from '@openzeppelin/upgrades-core/dist/eip-1967';

export type PrepareUpgradeFunction = (
  proxyAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxy, ImplFactory, opts: Options = {}) {
    const proxyAddress = getContractAddress(proxy);
    const { provider } = hre.network;
    if (await isBeaconProxy(provider, proxyAddress)) {
      const currentBeaconAddress = await getBeaconAddress(provider, proxyAddress);
      throw new Error(`The proxy is a beacon proxy which cannot be upgraded directly. Use upgradeBeacon() with the beacon at address ${currentBeaconAddress} instead.`);
    }
    const { impl } = await deployImpl(hre, ImplFactory, opts, proxyAddress);
    return impl;
  };
}
