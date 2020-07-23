import type { Deployment } from '@openzeppelin/upgrades-core';

import type { ContractClass, Deployer } from '../truffle';

export async function deploy(contract: ContractClass, deployer: Deployer): Promise<Deployment> {
  const { address, transactionHash: txHash } = await deployer.deploy(contract);
  if (txHash === undefined) {
    throw new Error('Transaction hash is undefined');
  }
  return { address, txHash };
}
