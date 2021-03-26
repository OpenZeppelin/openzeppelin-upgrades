import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { Manifest } from '@openzeppelin/upgrades-core';

import { deployImpl, Options, withDefaults } from './utils';

export type PrepareUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: Options,
) => Promise<string>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts: Options = {}) {
    const requiredOpts: Required<Options> = withDefaults(opts);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    if (requiredOpts.kind === 'auto') {
      try {
        const { kind } = await manifest.getProxyFromAddress(proxyAddress);
        requiredOpts.kind = kind;
      } catch (e) {
        if (e instanceof Error) {
          requiredOpts.kind = 'transparent';
        } else {
          throw e;
        }
      }
    }

    return await deployImpl(hre, ImplFactory, requiredOpts, { proxyAddress, manifest });
  };
}
