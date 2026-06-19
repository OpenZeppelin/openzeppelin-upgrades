import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType } from '@nomicfoundation/hardhat-viem/types';

import { forceImport as engineForceImport } from '../engine/force-import.js';
import type { ForceImportOptions } from './options.js';
import { getUpgradeableBeaconContract } from './upgradeable-beacon.js';
import {
  attachViemContract,
  ContractAddressOrInstance,
  getContractAddress,
  getContractInfo,
  makeReadBinding,
} from './utils.js';

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
  return async function forceImport<ContractName extends StringWithArtifactContractNamesAutocompletion>(
    addressOrInstance: ContractAddressOrInstance,
    contractName: ContractName,
    opts: ForceImportOptions = {},
  ): Promise<ContractReturnType<ContractName>> {
    const address = getContractAddress(addressOrInstance);

    const binding = await makeReadBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    const classification = await engineForceImport(binding, address, implInfo, opts);

    // For an imported beacon, return the beacon contract like the ethers-based API does.
    if (classification === 'beacon') {
      const beacon = await getUpgradeableBeaconContract(connection, address, opts.client);
      // The beacon's ABI is unrelated to the named contract's, as documented on ForceImportFunction.
      return beacon as unknown as ContractReturnType<ContractName>;
    } else {
      // Attach from the implementation ABI rather than re-reading the artifact, and without
      // requiring an account: the import (above) does not need one, so neither should building the
      // returned instance — it is read-capable, and write-capable when an account is available.
      return attachViemContract<ContractName>(connection, implInfo.abi, address, opts.client);
    }
  };
}
