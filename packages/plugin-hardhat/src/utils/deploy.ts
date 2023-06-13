import type { Deployment, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import debug from './debug';
import type { ethers, ContractFactory, Signer } from 'ethers';
import { getCreateAddress } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { platformDeploy } from '../platform/deploy';
import { PlatformDeployOptions, UpgradeOptions } from './options';

export interface DeployTransaction {
  deployTransaction: null | ethers.TransactionResponse;
}

export async function deploy(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeOptions & PlatformDeployOptions,
  factory: ContractFactory,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction> & RemoteDeploymentId> {
  if (opts?.usePlatformDeploy) {
    return await platformDeploy(hre, factory, opts, ...args);
  } else {
    return await ethersDeploy(factory, ...args);
  }
}

async function ethersDeploy(factory: ContractFactory, ...args: unknown[]) {
  const contractInstance = await factory.deploy(...args);
  const deployTransaction = contractInstance.deploymentTransaction();

  if (deployTransaction === null) {
    throw new Error('Broken invariant: deploymentTransaction is null');
  }

  const contractAddress = await contractInstance.getAddress();
  let address = contractAddress;

  const runner = factory.runner;
  if (runner && 'getAddress' in runner) {
    const from = await (runner as Signer).getAddress();

    address = getCreateAddress({
      from: from,
      nonce: deployTransaction.nonce,
    });
    if (address !== contractAddress) {
      debug(`overriding contract address from ${contractAddress} to ${address} for nonce ${deployTransaction.nonce}`);
    }
  }

  const txHash = deployTransaction.hash;
  return { address, txHash, deployTransaction };
}
