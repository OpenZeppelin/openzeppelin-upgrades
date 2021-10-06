import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { withValidationDefaults, setProxyKind } from '@openzeppelin/upgrades-core';

import { ContractAddressOrInstance, deployImpl, getContractAddress } from './utils';

import { DeployOptions } from './deploy-proxy';

export type PrepareUpgradeFunction = (
  proxyAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: DeployOptions,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxy, ImplFactory, opts: DeployOptions = {}) {
    const { provider } = hre.network;

    const proxyAddress = getContractAddress(proxy);

    await setProxyKind(provider, proxyAddress, opts);

    return await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress, opts.constructorArgs);
  };
}
