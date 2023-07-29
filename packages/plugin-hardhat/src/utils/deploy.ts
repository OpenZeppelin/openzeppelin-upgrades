import type { Deployment, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import type { ethers, ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { platformDeploy } from '../platform/deploy';
import { PlatformDeployOptions, UpgradeOptions } from './options';

export interface DeployTransaction {
  deployTransaction?: ethers.TransactionResponse;
}

export async function deploy(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeOptions & PlatformDeployOptions,
  factory: ContractFactory,
  ...args: unknown[]
): Promise<Required<Deployment> & DeployTransaction & RemoteDeploymentId> {
  // platform always includes RemoteDeploymentId, while ethers always includes DeployTransaction
  if (opts?.usePlatformDeploy) {
    return await platformDeploy(hre, factory, opts, ...args);
  } else {
    return await ethersDeploy(factory, ...args);
  }
}

async function ethersDeploy(
  factory: ContractFactory,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction> & RemoteDeploymentId> {
  const contractInstance = await factory.deploy(...args);

  const deployTransaction = contractInstance.deploymentTransaction();
  if (deployTransaction === null) {
    throw new Error('Broken invariant: deploymentTransaction is null');
  }

  const address = await contractInstance.getAddress();
  const txHash = deployTransaction.hash;

  return { address, txHash, deployTransaction };
}
