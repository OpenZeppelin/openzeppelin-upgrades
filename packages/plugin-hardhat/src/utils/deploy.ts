import type { Deployment } from '@openzeppelin/upgrades-core';
import debug from './debug';
import type { ethers, ContractFactory } from 'ethers';
import { getContractAddress } from 'ethers/lib/utils';

export interface DeployTransaction {
  deployTransaction: ethers.providers.TransactionResponse;
}

export async function deploy(
  factory: ContractFactory,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction>> {
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
