import type { Deployment } from '@openzeppelin/upgrades-core';
import { UpgradeOptions } from './options';
import type { ContractClass, Deployer } from './truffle';

export async function deploy(
  deployer: Deployer,
  opts: UpgradeOptions,
  contract: ContractClass,
  ...args: unknown[]
): Promise<Required<Deployment>> {
  if (opts.txOverrides !== undefined) {
    args.push(opts.txOverrides);
  }
  const { address, transactionHash: txHash } = await deployer.deploy(contract, ...args);
  if (txHash === undefined) {
    throw new Error('Transaction hash is undefined');
  }
  return { address, txHash };
}
