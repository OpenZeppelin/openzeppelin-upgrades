import type { Deployment } from '@openzeppelin/upgrades-core';

import type { ContractClass, Deployer } from '../truffle';

export interface DeployerOptions {
  from?: string;
}

export async function deploy(contract: ContractClass, deployer: Deployer, deployerOpts: DeployerOptions): Promise<Deployment> {
  const { address, transactionHash: txHash } = await deployer.deploy(contract, deployerOpts);
  if (txHash === undefined) {
    throw new Error('Transaction hash is undefined');
  }
  return { address, txHash };
}
