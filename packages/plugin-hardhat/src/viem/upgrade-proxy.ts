import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { upgradeProxy as engineUpgradeProxy } from '../engine/upgrade-proxy.js';
import type { UpgradeProxyOptions } from './options.js';
import {
  ContractAddressOrInstance,
  getContractAddress,
  getContractInfo,
  getViemContractAt,
  makeBinding,
} from './utils.js';

export type UpgradeProxyFunction = <ContractName extends StringWithArtifactContractNamesAutocompletion>(
  proxy: ContractAddressOrInstance,
  contractName: ContractName,
  opts?: UpgradeProxyOptions,
) => Promise<ContractReturnType<ContractName>>;

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): UpgradeProxyFunction {
  return async function upgradeProxy<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    proxy: ContractAddressOrInstance,
    contractName: ContractName,
    opts: UpgradeProxyOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    const proxyAddress = getContractAddress(proxy);

    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    // The viem binding waits for the upgrade transaction's receipt before returning.
    await engineUpgradeProxy(binding, proxyAddress, implInfo, opts);

    return getViemContractAt(connection, contractName, proxyAddress, opts.client);
  };
}
