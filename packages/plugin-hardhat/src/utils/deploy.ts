import type { Deployment, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import debug from './debug';
import type { ethers, ContractFactory } from 'ethers';
import { getContractAddress } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { platformDeploy } from '../platform/deploy';
import { PlatformDeployOptions, UpgradeOptions } from './options';

export interface DeployTransaction {
  deployTransaction: ethers.providers.TransactionResponse;
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
  const { deployTransaction } = contractInstance;

  const address: string = getContractAddress({
    from: await factory.signer.getAddress(),
    nonce: deployTransaction.nonce,
  });
  if (address !== contractInstance.address) {
    debug(
      `overriding contract address from ${contractInstance.address} to ${address} for nonce ${deployTransaction.nonce}`,
    );
  }

  const txHash = deployTransaction.hash;
  return { address, txHash, deployTransaction };
}
