import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { withValidationDefaults, setProxyKind } from '@openzeppelin/upgrades-core';

import { Options, ContractAddressOrInstance, deployImpl, getContractAddress } from './utils';

export type PrepareUpgradeFunction = (
  proxyAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxy, ImplFactory, opts: Options = {}) {
    const { provider } = hre.network;

    const proxyAddress = getContractAddress(proxy);

    await setProxyKind(provider, proxyAddress, opts);

    return await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress, opts.constructorArgs);
  };
}
