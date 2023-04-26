import { ContractClass, DeployImplementationOptions, deployUpgradeableImpl } from './utils';

export async function deployImplementation(
  Contract: ContractClass,
  opts: DeployImplementationOptions = {},
): Promise<string> {
  const deployedImpl = await deployUpgradeableImpl(Contract, opts);
  return deployedImpl.impl;
}
