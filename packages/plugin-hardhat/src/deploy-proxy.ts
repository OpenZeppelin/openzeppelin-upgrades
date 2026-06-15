import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory } from 'ethers';

import { DeployProxyOptions } from './utils/index.js';
import { enableDefender } from './defender/utils.js';
import { getContractInstance } from './utils/contract-instance.js';
import { ContractTypeOfFactory } from './type-extensions.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { deployProxy as engineDeployProxy } from './engine/deploy-proxy.js';

export interface DeployFunction {
  <F extends ContractFactory>(
    ImplFactory: F,
    args?: unknown[],
    opts?: DeployProxyOptions,
  ): Promise<ContractTypeOfFactory<F>>;
  <F extends ContractFactory>(ImplFactory: F, opts?: DeployProxyOptions): Promise<ContractTypeOfFactory<F>>;
}

export function makeDeployProxy(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): DeployFunction {
  return async function deployProxy<F extends ContractFactory>(
    ImplFactory: F,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployProxyOptions = {},
  ): Promise<ContractTypeOfFactory<F>> {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    opts = enableDefender(hre, defenderModule, opts);

    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const proxyDeployment = await engineDeployProxy(binding, contractInfo(ImplFactory), args, opts);

    return getContractInstance(hre, ImplFactory, opts, proxyDeployment);
  };
}
