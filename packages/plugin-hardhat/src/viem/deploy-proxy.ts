import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { makeDeployProxy as makeEthersDeployProxy } from '../deploy-proxy.js';
import type { DeployProxyOptions as EthersDeployProxyOptions } from '../utils/options.js';
import type { DeployProxyOptions } from './options.js';
import { asAddress, getContractFactory, getViemContractAt, toEthersOptions } from './utils.js';

export interface DeployProxyFunction {
  <ContractName extends StringWithArtifactContractNamesAutocompletion>(
    contractName: ContractName,
    args?: unknown[],
    opts?: DeployProxyOptions,
  ): Promise<ContractReturnType<ContractName>>;
  <ContractName extends StringWithArtifactContractNamesAutocompletion>(
    contractName: ContractName,
    opts?: DeployProxyOptions,
  ): Promise<ContractReturnType<ContractName>>;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): DeployProxyFunction {
  const ethersDeployProxy = makeEthersDeployProxy(hre, false, connection);

  return async function deployProxy<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    contractName: ContractName,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployProxyOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const factory = await getContractFactory(connection, contractName, opts);
    const proxy = await ethersDeployProxy(factory, args, toEthersOptions<EthersDeployProxyOptions>(opts));
    await proxy.deploymentTransaction()?.wait();

    return getViemContractAt(connection, contractName, asAddress(await proxy.getAddress()), opts.client);
  };
}
