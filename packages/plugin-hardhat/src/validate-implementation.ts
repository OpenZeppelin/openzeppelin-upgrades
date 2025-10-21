import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import type { ContractFactory } from 'ethers';

import { validateImpl } from './utils/validate-impl.js';
import { getDeployData } from './utils/deploy-impl.js';
import { ValidateImplementationOptions } from './utils/index.js';

export type ValidateImplementationFunction = (
  ImplFactory: ContractFactory,
  opts?: ValidateImplementationOptions,
) => Promise<void>;

export function makeValidateImplementation(hre: HardhatRuntimeEnvironment): ValidateImplementationFunction {
  return async function validateImplementation(ImplFactory, opts: ValidateImplementationOptions = {}) {
    const deployData = await getDeployData(hre, ImplFactory, opts);
    await validateImpl(deployData, opts);
  };
}
