import { ValidationOptions } from '@openzeppelin/upgrades-core';
import { ContractClass, getDeployData } from './utils';
import { validateStandaloneImpl } from './utils/validate-impl';

export async function validateImplementation(Contract: ContractClass, opts: ValidationOptions = {}): Promise<void> {
  const deployData = await getDeployData(opts, Contract);
  await validateStandaloneImpl(deployData, opts);
}
