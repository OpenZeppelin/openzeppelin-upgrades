import type { Deployment, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import type { ethers, ContractFactory, ContractMethodArgs } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { defenderDeploy } from '../defender/deploy';
import { runVerify } from '../verify-proxy';
import { EthersDeployOptions, DefenderDeployOptions, UpgradeOptions } from './options';

export interface DeployTransaction {
  deployTransaction?: ethers.TransactionResponse;
}

export type DeployResponse = Required<Deployment> & DeployTransaction & RemoteDeploymentId;

export async function deploy(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeOptions & EthersDeployOptions & DefenderDeployOptions,
  factory: ContractFactory,
  ...args: unknown[]
): Promise<DeployResponse> {
  // defender always includes RemoteDeploymentId, while ethers always includes DeployTransaction
  let response: DeployResponse;
  if (opts?.useDefenderDeploy) {
    response = await defenderDeploy(hre, factory, opts, ...args);
  } else {
    if (opts.txOverrides !== undefined) {
      args.push(opts.txOverrides);
    }
    response = await ethersDeploy(factory, ...args);
  }

  await runVerify(hre, response.address, opts.constructorArgs);

  return response;
}

async function ethersDeploy(
  factory: ContractFactory,
  ...args: ContractMethodArgs<unknown[]>
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
