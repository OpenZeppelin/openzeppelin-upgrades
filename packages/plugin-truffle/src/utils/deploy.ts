import type { Deployment } from '@openzeppelin/upgrades-core';
import { UpgradeOptions } from './options';
import type { ContractClass, Deployer } from './truffle';

export async function deploy(
  deployer: Deployer,
  opts: UpgradeOptions,
  contract: ContractClass,
  ...args: unknown[]
): Promise<Required<Deployment>> {
  const { address, transactionHash: txHash } = await deployer.deploy(contract, ...args, opts.txOverrides ?? {});
  if (txHash === undefined) {
    throw new Error('Transaction hash is undefined');
  }
  return { address, txHash };
}
