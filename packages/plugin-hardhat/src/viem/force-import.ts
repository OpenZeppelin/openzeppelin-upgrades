import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { getImplementationAddressFromProxy, isBeacon } from '@openzeppelin/upgrades-core';

import { makeForceImport as makeEthersForceImport } from '../force-import.js';
import type { ForceImportOptions } from './options.js';
import { getUpgradeableBeaconContract } from './upgradeable-beacon.js';
import { ContractAddressOrInstance, getContractAddress, getContractFactory, getViemContractAt } from './utils.js';

/**
 * If the imported address is a beacon, the returned instance is its UpgradeableBeacon
 * contract (an `UpgradeableBeaconContract`) rather than an instance of the named contract,
 * like the ethers-based API.
 */
export type ForceImportFunction = <ContractName extends StringWithArtifactContractNamesAutocompletion>(
  addressOrInstance: ContractAddressOrInstance,
  contractName: ContractName,
  opts?: ForceImportOptions,
) => Promise<ContractReturnType<ContractName>>;

export function makeForceImport(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): ForceImportFunction {
  const ethersForceImport = makeEthersForceImport(hre, connection);

  return async function forceImport<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    addressOrInstance: ContractAddressOrInstance,
    contractName: ContractName,
    opts: ForceImportOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    const address = getContractAddress(addressOrInstance);

    const factory = await getContractFactory(connection, contractName, opts);
    await ethersForceImport(address, factory, { kind: opts.kind });

    // For an imported beacon, return the beacon contract like the ethers-based API does.
    // Classify with the same precedence as the ethers-based forceImport: an address is only
    // a beacon if it is not a proxy, since the beacon detection's implementation() call
    // would delegate through a proxy to its implementation contract.
    const provider = connection.ethers.provider;
    const isProxy = (await getImplementationAddressFromProxy(provider, address)) !== undefined;
    if (!isProxy && (await isBeacon(provider, address))) {
      const beacon = await getUpgradeableBeaconContract(connection, address, opts.client);
      // The beacon's ABI is unrelated to the named contract's, as documented on ForceImportFunction.
      return beacon as unknown as ContractReturnType<ContractName>;
    } else {
      return getViemContractAt(connection, contractName, address, opts.client);
    }
  };
}
