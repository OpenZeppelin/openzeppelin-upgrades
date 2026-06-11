import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { makeDeployBeaconProxy as makeEthersDeployBeaconProxy } from '../deploy-beacon-proxy.js';
import type { DeployBeaconProxyOptions as EthersDeployBeaconProxyOptions } from '../utils/options.js';
import type { DeployBeaconProxyOptions } from './options.js';
import {
  asAddress,
  ContractAddressOrInstance,
  getContractAddress,
  getInterfaceFactory,
  getViemContractAt,
  toEthersOptions,
  waitForPendingTransaction,
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
  const ethersDeployBeaconProxy = makeEthersDeployBeaconProxy(hre, false, connection);

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

    // The contract name identifies the beacon's current implementation. Only its interface is
    // used (to encode the initializer call and to attach), so an ABI-only factory is sufficient.
    const attachTo = await getInterfaceFactory(hre, connection, contractName, opts);
    const proxy = await ethersDeployBeaconProxy(
      getContractAddress(beacon),
      attachTo,
      args,
      toEthersOptions<EthersDeployBeaconProxyOptions>(opts),
    );
    await waitForPendingTransaction(proxy);

    return getViemContractAt(connection, contractName, asAddress(await proxy.getAddress()), opts.client);
  };
}
