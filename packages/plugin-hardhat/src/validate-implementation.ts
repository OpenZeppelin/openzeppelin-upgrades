import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import { validateStandaloneImpl } from './utils/validate-impl';
import { getDeployData } from './utils/deploy-impl';
import { ValidationOptions } from '@openzeppelin/upgrades-core';

export type ValidateImplementationFunction = (ImplFactory: ContractFactory, opts?: ValidationOptions) => Promise<void>;

export function makeValidateImplementation(hre: HardhatRuntimeEnvironment): ValidateImplementationFunction {
  return async function validateImplementation(ImplFactory, opts: ValidationOptions = {}) {
    const deployData = await getDeployData(hre, ImplFactory, opts);
    await validateStandaloneImpl(deployData, opts);
  };
}
