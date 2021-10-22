import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { ValidationOptions } from '@openzeppelin/upgrades-core';

import { Options, ContractAddressOrInstance, deployImpl, getContractAddress, withDefaults } from './utils';

export type PrepareUpgradeFunction = (
  proxyAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxy, ImplFactory, opts: Options = {}) {
    const proxyAddress = getContractAddress(proxy);
    const { impl } = await deployImpl(hre, ImplFactory, opts, proxyAddress);
    return impl;
  };
}
