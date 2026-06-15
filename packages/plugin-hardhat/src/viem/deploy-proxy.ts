import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { deployProxy as engineDeployProxy } from '../engine/deploy-proxy.js';
import type { DeployProxyOptions } from './options.js';
import { asAddress, getViemContractAt, getContractInfo, makeBinding } from './utils.js';

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
  return async function deployProxy<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    contractName: ContractName,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployProxyOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    const proxyDeployment = await engineDeployProxy(binding, implInfo, args, opts);

    return getViemContractAt(connection, contractName, asAddress(proxyDeployment.address), opts.client);
  };
}
