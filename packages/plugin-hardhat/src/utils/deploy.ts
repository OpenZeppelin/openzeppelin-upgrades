import type { ContractFactory } from 'ethers';
import type { Deployment } from '@openzeppelin/upgrades-core';
export interface TxExecutor {
  (factory: ContractFactory, args: unknown[]): Promise<Deployment>;
}

export async function defaultDeploy(factory: ContractFactory, args: unknown[]): Promise<Deployment> {
  const { address, deployTransaction } = await factory.deploy(...args);
  const txHash = deployTransaction.hash;
  return { address, txHash };
}
