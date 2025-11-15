import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, ethers } from 'ethers';

import { DeployImplementationOptions } from './utils/index.js';
import { deployUpgradeableImpl } from './utils/deploy-impl.js';
import { enableDefender } from './defender/utils.js';

export type DeployImplementationFunction = (
  ImplFactory: ContractFactory,
  opts?: DeployImplementationOptions,
) => Promise<DeployImplementationResponse>;

export type DeployImplementationResponse = string | ethers.TransactionResponse;

export function makeDeployImplementation(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): DeployImplementationFunction {
  return async function deployImplementation(ImplFactory, opts: DeployImplementationOptions = {}) {
    opts = enableDefender(hre, defenderModule, opts);

    const deployedImpl = await deployUpgradeableImpl(hre, ImplFactory, opts, undefined, connection);

    if (opts.getTxResponse && deployedImpl.txResponse) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}
