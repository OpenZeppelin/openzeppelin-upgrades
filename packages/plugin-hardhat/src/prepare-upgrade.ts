import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Manifest,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import {
  deployImpl,
  Options,
  withDefaults,
} from './utils';

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

    // Autodetect proxy type
    const adminAddress = await getAdminAddress(provider, proxyAddress);
    if (requiredOpts.kind === 'auto') {
      requiredOpts.kind = adminAddress === '0x0000000000000000000000000000000000000000' ? 'uups' : 'transparent';
    }

    return await deployImpl(hre, ImplFactory, requiredOpts, { proxyAddress, manifest });
  };
}
