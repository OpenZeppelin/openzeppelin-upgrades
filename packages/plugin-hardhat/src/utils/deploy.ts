import type { ContractFactory, ContractTransaction } from 'ethers';
import type { Deployment } from '@openzeppelin/upgrades-core';
export interface DeploymentExecutor {
  (factory: ContractFactory): Promise<HardhatDeployment>;
}

export interface HardhatDeployment {
  address: string;
  deployTransaction: ContractTransaction;
}

export function defaultDeploy(factory: ContractFactory, args: unknown[]): Promise<HardhatDeployment> {
  return factory.deploy(...args);
}

export function intoCoreDeployment({ address, deployTransaction }: HardhatDeployment): Deployment {
  return { address, txHash: deployTransaction.hash };
}
