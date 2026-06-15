import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { ContractFactory, TransactionResponse } from 'ethers';
import assert from 'assert';

import { DefenderDeploy } from './index.js';
import { waitForDeployment } from '../defender/utils.js';
import { DeployOpts } from '@openzeppelin/upgrades-core';
import { attach } from './ethers.js';
import { ContractTypeOfFactory } from '../type-extensions.js';
import type { DeployedContract } from '../engine/binding.js';

/**
 * Gets a contract instance from a deployment, where the deployment may be remote.
 * If the deployment is remote, the instance has an overridden `waitForDeployment` method to wait for the remote deployment
 * and update its `deploymentTransaction` with the new transaction hash if it was detected to have changed.
 *
 * @param hre The Hardhat Runtime Environment
 * @param contract The contract factory
 * @param opts The deploy and defender options
 * @param deployment The deployment
 * @returns The contract instance
 */
export function getContractInstance<F extends ContractFactory>(
  hre: HardhatRuntimeEnvironment,
  contract: F,
  opts: DeployOpts & DefenderDeploy,
  deployment: DeployedContract,
): ContractTypeOfFactory<F> {
  const instance = attach(contract, deployment.address) as ContractTypeOfFactory<F>;

  // @ts-ignore Won't be readonly because instance was created through attach.
  instance.deploymentTransaction = () => (deployment.deployTransaction as TransactionResponse | undefined) ?? null; // Convert undefined to null to conform to ethers.js types.

  if (opts.useDefenderDeploy && deployment.remoteDeploymentId !== undefined) {
    const origWait = instance.waitForDeployment.bind(instance);
    instance.waitForDeployment = async () => {
      assert(deployment.remoteDeploymentId !== undefined);
      const updatedTxHash = await waitForDeployment(
        hre,
        opts,
        await instance.getAddress(),
        deployment.remoteDeploymentId,
      );

      const { ethers } = await hre.network.create();

      if (updatedTxHash !== undefined && updatedTxHash !== deployment.txHash) {
        const updatedTx = await ethers.provider.getTransaction(updatedTxHash);
        // @ts-ignore Won't be readonly because instance was created through attach.
        instance.deploymentTransaction = () => updatedTx;
      }

      return await origWait();
    };
  }
  return instance;
}
