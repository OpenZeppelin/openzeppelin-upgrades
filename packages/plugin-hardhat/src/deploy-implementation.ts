import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, ethers } from 'ethers';

import { DeployImplementationOptions } from './utils';
import { deployUpgradeableImpl } from './utils/deploy-impl';
import { enablePlatform } from './platform/utils';

export type DeployImplementationFunction = (
  ImplFactory: ContractFactory,
  opts?: DeployImplementationOptions,
) => Promise<DeployImplementationResponse>;

export type DeployImplementationResponse = string | ethers.providers.TransactionResponse;

export function makeDeployImplementation(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
): DeployImplementationFunction {
  return async function deployImplementation(ImplFactory, opts: DeployImplementationOptions = {}) {
    opts = enablePlatform(hre, platformModule, opts);

    const deployedImpl = await deployUpgradeableImpl(hre, ImplFactory, opts);

    if (opts.getTxResponse && deployedImpl.txResponse !== undefined) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}
