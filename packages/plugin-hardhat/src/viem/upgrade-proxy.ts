import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { makeUpgradeProxy as makeEthersUpgradeProxy } from '../upgrade-proxy.js';
import type { UpgradeProxyOptions as EthersUpgradeProxyOptions } from '../utils/options.js';
import type { UpgradeProxyOptions } from './options.js';
import {
  ContractAddressOrInstance,
  getContractAddress,
  getContractFactory,
  getViemContractAt,
  toEthersOptions,
  waitForAttachedTransaction,
} from './utils.js';

export type UpgradeProxyFunction = <ContractName extends StringWithArtifactContractNamesAutocompletion>(
  proxy: ContractAddressOrInstance,
  contractName: ContractName,
  opts?: UpgradeProxyOptions,
) => Promise<ContractReturnType<ContractName>>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): UpgradeProxyFunction {
  const ethersUpgradeProxy = makeEthersUpgradeProxy(hre, false, connection);

  return async function upgradeProxy<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    proxy: ContractAddressOrInstance,
    contractName: ContractName,
    opts: UpgradeProxyOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    const proxyAddress = getContractAddress(proxy);

    const factory = await getContractFactory(connection, contractName, opts);
    const upgraded = await ethersUpgradeProxy(proxyAddress, factory, toEthersOptions<EthersUpgradeProxyOptions>(opts));
    await waitForAttachedTransaction(upgraded);

    return getViemContractAt(connection, contractName, proxyAddress, opts.client);
  };
}
