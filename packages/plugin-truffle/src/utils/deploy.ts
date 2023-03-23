import type { BaseDeployment } from '@openzeppelin/upgrades-core';
import type { ContractClass, Deployer } from './truffle';

export async function deploy(
  deployer: Deployer,
  contract: ContractClass,
  ...args: unknown[]
): Promise<Required<BaseDeployment>> {
  const { address, transactionHash: txHash } = await deployer.deploy(contract, ...args);
  if (txHash === undefined) {
    throw new Error('Transaction hash is undefined');
  }
  return { address, txHash };
}
