import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

import { isBeacon } from '@openzeppelin/upgrades-core';

import { makeForceImport as makeEthersForceImport } from '../force-import.js';
import type { ForceImportOptions } from './options.js';
import { getUpgradeableBeaconContract, UpgradeableBeaconContract } from './upgradeable-beacon.js';
import { getContractFactory, getViemContractAt } from './utils.js';

export type ForceImportFunction = <ContractName extends StringWithArtifactContractNamesAutocompletion>(
  address: Address,
  contractName: ContractName,
  opts?: ForceImportOptions,
) => Promise<ContractReturnType<ContractName> | UpgradeableBeaconContract>;

export function makeForceImport(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): ForceImportFunction {
  const ethersForceImport = makeEthersForceImport(hre, connection);

  return async function forceImport<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    address: Address,
    contractName: ContractName,
    opts: ForceImportOptions = {},
  ): Promise<ContractReturnType<ContractName> | UpgradeableBeaconContract> {
    const factory = await getContractFactory(connection, contractName, opts);
    await ethersForceImport(address, factory, { kind: opts.kind });

    // For an imported beacon, return the beacon contract like the ethers-based API does.
    // Otherwise return the implementation contract attached to the given address.
    if (await isBeacon(connection.ethers.provider, address)) {
      return getUpgradeableBeaconContract(connection, address);
    } else {
      return getViemContractAt(connection, contractName, address);
    }
  };
}
