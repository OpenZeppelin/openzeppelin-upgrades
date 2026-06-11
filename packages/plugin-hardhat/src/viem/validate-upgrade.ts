import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { makeValidateUpgrade as makeEthersValidateUpgrade } from '../validate-upgrade.js';
import type { ValidateUpgradeOptions as EthersValidateUpgradeOptions } from '../utils/options.js';
import type { ValidateUpgradeOptions } from './options.js';
import {
  ContractAddressOrInstance,
  getContractAddress,
  getContractFactory,
  isAddress,
  toEthersOptions,
} from './utils.js';

export interface ValidateUpgradeFunction {
  (
    origContractName: StringWithArtifactContractNamesAutocompletion,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts?: ValidateUpgradeOptions,
  ): Promise<void>;
  (
    proxyOrBeaconAddress: ContractAddressOrInstance,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts?: ValidateUpgradeOptions,
  ): Promise<void>;
}

export function makeValidateUpgrade(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateUpgradeFunction {
  const ethersValidateUpgrade = makeEthersValidateUpgrade(hre, connection);

  return async function validateUpgrade(
    reference: StringWithArtifactContractNamesAutocompletion | ContractAddressOrInstance,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts: ValidateUpgradeOptions = {},
  ): Promise<void> {
    const newImplFactory = await getContractFactory(connection, newContractName, opts);
    const ethersOpts = toEthersOptions<EthersValidateUpgradeOptions>(opts);

    if (typeof reference === 'string' && !isAddress(reference)) {
      // The reference is a contract name
      const origImplFactory = await getContractFactory(connection, reference, opts);
      await ethersValidateUpgrade(origImplFactory, newImplFactory, ethersOpts);
    } else {
      await ethersValidateUpgrade(getContractAddress(reference), newImplFactory, ethersOpts);
    }
  };
}
