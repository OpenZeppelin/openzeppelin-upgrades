import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Options,
  ContractAddressOrInstance,
  getContractAddress,
  BeaconProxyUnsupportedError,
  deployProxyImpl,
} from './utils';
import { isBeaconProxy } from '@openzeppelin/upgrades-core';

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
      throw new BeaconProxyUnsupportedError();
    }
    const { impl } = await deployProxyImpl(hre, ImplFactory, opts, proxyAddress);
    return impl;
  };
}
