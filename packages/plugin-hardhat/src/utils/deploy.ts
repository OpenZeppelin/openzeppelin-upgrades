import type { Deployment } from '@openzeppelin/upgrades-core';
import type { ContractFactory } from 'ethers';

export async function deploy(factory: ContractFactory, ...args: unknown[]): Promise<Required<Deployment>> {
  const { address, deployTransaction } = await factory.deploy(...args);
  const txHash = deployTransaction.hash;
  return { address, txHash };
}
