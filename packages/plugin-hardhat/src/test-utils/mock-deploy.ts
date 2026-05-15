import type { ContractFactory } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import type { EthersOrDefenderDeployment } from '../utils/deploy.js';
import type { DefenderDeployOptions, EthersDeployOptions, UpgradeOptions } from '../utils/options.js';

export async function mockDeploy(
  _hre: HardhatRuntimeEnvironment,
  opts: UpgradeOptions & EthersDeployOptions & DefenderDeployOptions,
  factory: ContractFactory,
  ...args: unknown[]
): Promise<EthersOrDefenderDeployment> {
  const deployArgs = [...args];

  if (opts.txOverrides !== undefined) {
    deployArgs.push(opts.txOverrides);
  }

  const contractInstance = await factory.deploy(...deployArgs);
  const deployTransaction = contractInstance.deploymentTransaction();

  if (deployTransaction === null) {
    throw new Error('Broken invariant: deploymentTransaction is null');
  }

  const address = await contractInstance.getAddress();
  const txHash = deployTransaction.hash;

  return {
    address,
    txHash,
    deployTransaction,
    remoteDeploymentId: 'abc',
  };
}
