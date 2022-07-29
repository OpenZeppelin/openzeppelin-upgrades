import { ContractClass, DeployImplementationOptions, deployStandaloneImpl } from './utils';

export async function deployImplementation(
  Contract: ContractClass,
  opts: DeployImplementationOptions = {},
): Promise<string> {
  const deployedImpl = await deployStandaloneImpl(Contract, opts);
  return deployedImpl.impl;
}
