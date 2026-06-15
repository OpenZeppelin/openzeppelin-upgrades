import type { ContractFactory } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import { getDeployData as engineGetDeployData, DeployData } from '../engine/deploy-impl.js';
import type { UpgradeOptions } from '../engine/options.js';
import { makeEthersBinding, contractInfo } from '../ethers-binding.js';

export type { DeployData } from '../engine/deploy-impl.js';

/**
 * Ethers-flavored adapter over the engine's `getDeployData`, kept for the Defender deploy path
 * (`src/defender/deploy.ts`) and `deployContract`, which derive the deployment's contract name,
 * validations, and encoded constructor bytecode from an ethers `ContractFactory`.
 */
export async function getDeployData(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
  connection: NetworkConnection,
): Promise<DeployData> {
  const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
  return engineGetDeployData(binding, contractInfo(ImplFactory), opts);
}
