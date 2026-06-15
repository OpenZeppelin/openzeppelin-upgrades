import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { validateImplementation as engineValidateImplementation } from '../engine/validate.js';
import type { ValidateImplementationOptions } from './options.js';
import { getContractInfo, makeReadBinding } from './utils.js';

export type ValidateImplementationFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: ValidateImplementationOptions,
) => Promise<void>;

export function makeValidateImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateImplementationFunction {
  return async function validateImplementation(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: ValidateImplementationOptions = {},
  ): Promise<void> {
    const binding = await makeReadBinding(hre, connection);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    await engineValidateImplementation(binding, implInfo, opts);
  };
}
