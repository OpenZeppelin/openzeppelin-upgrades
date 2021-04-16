import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { ValidationOptions, withValidationDefaults, setProxyKind } from '@openzeppelin/upgrades-core';

import { deployImpl } from './utils';

export type PrepareUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ValidationOptions,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts: ValidationOptions = {}) {
    const { provider } = hre.network;

    await setProxyKind(provider, proxyAddress, opts);

    return await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress);
  };
}
