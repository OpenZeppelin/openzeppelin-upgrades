import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { makeValidateImplementation as makeEthersValidateImplementation } from '../validate-implementation.js';
import type { ValidateImplementationOptions as EthersValidateImplementationOptions } from '../utils/options.js';
import type { ValidateImplementationOptions } from './options.js';
import { getContractFactory, toEthersOptions } from './utils.js';

export type ValidateImplementationFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: ValidateImplementationOptions,
) => Promise<void>;

export function makeValidateImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateImplementationFunction {
  const ethersValidateImplementation = makeEthersValidateImplementation(hre, connection);

  return async function validateImplementation(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: ValidateImplementationOptions = {},
  ): Promise<void> {
    const factory = await getContractFactory(connection, contractName, opts);
    await ethersValidateImplementation(factory, toEthersOptions<EthersValidateImplementationOptions>(opts));
  };
}
