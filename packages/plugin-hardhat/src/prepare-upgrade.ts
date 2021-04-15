import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { DeploymentNotFound, Manifest, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

import { deployImpl } from './utils';

export type PrepareUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ValidationOptions,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts: ValidationOptions = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    if (opts.kind === undefined) {
      try {
        const { kind } = await manifest.getProxyFromAddress(proxyAddress);
        opts.kind = kind;
      } catch (e) {
        if (e instanceof DeploymentNotFound) {
          opts.kind = 'transparent';
        } else {
          throw e;
        }
      }
    }

    return await deployImpl(hre, ImplFactory, withValidationDefaults(opts), proxyAddress);
  };
}
