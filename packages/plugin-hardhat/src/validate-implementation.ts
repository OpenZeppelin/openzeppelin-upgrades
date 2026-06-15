import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory } from 'ethers';

import { ValidateImplementationOptions } from './utils/index.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { validateImplementation as engineValidateImplementation } from './engine/validate.js';

export type ValidateImplementationFunction = (
  ImplFactory: ContractFactory,
  opts?: ValidateImplementationOptions,
) => Promise<void>;

export function makeValidateImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateImplementationFunction {
  return async function validateImplementation(ImplFactory, opts: ValidateImplementationOptions = {}) {
    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    await engineValidateImplementation(binding, contractInfo(ImplFactory), opts);
  };
}
