import type { Deployment } from '@openzeppelin/upgrades-core';
import type { ethers, ContractFactory } from 'ethers';

export interface DeployTransaction {
  deployTransaction: ethers.providers.TransactionResponse;
}

export async function deploy(
  factory: ContractFactory,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction>> {
  const { address, deployTransaction } = await factory.deploy(...args);
  const txHash = deployTransaction.hash;
  return { address, txHash, deployTransaction };
}
