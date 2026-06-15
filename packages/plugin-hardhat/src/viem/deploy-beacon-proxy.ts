import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { deployBeaconProxy as engineDeployBeaconProxy } from '../engine/deploy-beacon-proxy.js';
import type { DeployBeaconProxyOptions } from './options.js';
import {
  asAddress,
  ContractAddressOrInstance,
  getAbi,
  getContractAddress,
  getViemContractAt,
  makeBinding,
} from './utils.js';

export interface DeployBeaconProxyFunction {
  <ContractName extends StringWithArtifactContractNamesAutocompletion>(
    beacon: ContractAddressOrInstance,
    contractName: ContractName,
    args?: unknown[],
    opts?: DeployBeaconProxyOptions,
  ): Promise<ContractReturnType<ContractName>>;
  <ContractName extends StringWithArtifactContractNamesAutocompletion>(
    beacon: ContractAddressOrInstance,
    contractName: ContractName,
    opts?: DeployBeaconProxyOptions,
  ): Promise<ContractReturnType<ContractName>>;
}

export function makeDeployBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): DeployBeaconProxyFunction {
  return async function deployBeaconProxy<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    beacon: ContractAddressOrInstance,
    contractName: ContractName,
    args: unknown[] | DeployBeaconProxyOptions = [],
    opts: DeployBeaconProxyOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const binding = await makeBinding(hre, connection, opts);
    // The contract name identifies the beacon's current implementation. Only its ABI is used,
    // to encode the initializer call.
    const attachToAbi = await getAbi(hre, contractName);
    const proxyDeployment = await engineDeployBeaconProxy(binding, getContractAddress(beacon), attachToAbi, args, opts);

    return getViemContractAt(connection, contractName, asAddress(proxyDeployment.address), opts.client);
  };
}
