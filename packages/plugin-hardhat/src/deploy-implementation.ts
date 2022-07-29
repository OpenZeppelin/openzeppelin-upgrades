import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, ethers } from 'ethers';

import { DeployImplementationOptions } from './utils';
import { deployStandaloneImpl } from './utils/deploy-impl';

export type DeployImplementationFunction = (
  ImplFactory: ContractFactory,
  opts?: DeployImplementationOptions,
) => Promise<DeployImplementationResponse>;

export type DeployImplementationResponse = string | ethers.providers.TransactionResponse;

export function makeDeployImplementation(hre: HardhatRuntimeEnvironment): DeployImplementationFunction {
  return async function deployImplementation(ImplFactory, opts: DeployImplementationOptions = {}) {
    const deployedImpl = await deployStandaloneImpl(hre, ImplFactory, opts);

    if (opts.getTxResponse && deployedImpl.txResponse !== undefined) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}
