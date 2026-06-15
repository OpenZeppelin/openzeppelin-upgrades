import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, ethers } from 'ethers';

import { DeployImplementationOptions } from './utils/index.js';
import { deployUpgradeableImpl } from './engine/deploy-impl.js';
import { enableDefender } from './defender/utils.js';
import { makeEthersBinding, contractInfo, txResponseOf } from './ethers-binding.js';

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

    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const deployedImpl = await deployUpgradeableImpl(binding, contractInfo(ImplFactory), opts, undefined);

    if (opts.getTxResponse) {
      const txResponse = await txResponseOf(deployedImpl.deployment, connection);
      if (txResponse) {
        return txResponse;
      }
    }
    return deployedImpl.impl;
  };
}
