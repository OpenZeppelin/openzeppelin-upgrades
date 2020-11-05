import type { Deployment } from '@openzeppelin/upgrades-core';
import type { ContractFactory } from 'ethers';

export async function deploy(factory: ContractFactory): Promise<Deployment> {
  const { address, deployTransaction } = await factory.deploy();
  const txHash = deployTransaction.hash;
  return { address, txHash };
}
