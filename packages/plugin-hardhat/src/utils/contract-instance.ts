import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';
import assert from 'assert';

import { DeployTransaction, DefenderDeploy } from '.';
import { waitForDeployment } from '../defender/utils';
import { Deployment, RemoteDeploymentId, DeployOpts } from '@openzeppelin/upgrades-core';
import { attach } from './ethers';
import { ContractTypeOfFactory } from '../type-extensions';

/**
 * Gets a contract instance from a deployment, where the deployment may be remote.
 * If the deployment is remote, the instance has an overridden `waitForDeployment` method to wait for the remote deployment
 * and update its `deploymentTransaction` with the new transaction hash if it was detected to have changed.
 *
 * @param hre The Hardhat Runtime Environment
 * @param contract The contract factory
 * @param opts The deploy and defender options
 * @param deployment The deployment
 * @param deployTransaction The transaction that deployed the contract, if available
 * @returns The contract instance
 */
export function getContractInstance<F extends ContractFactory>(
  hre: HardhatRuntimeEnvironment,
  contract: F,
  opts: DeployOpts & DefenderDeploy,
  deployment: Deployment & DeployTransaction & RemoteDeploymentId,
): ContractTypeOfFactory<F> {
  const instance = attach(contract, deployment.address) as ContractTypeOfFactory<F>;

  // @ts-ignore Won't be readonly because instance was created through attach.
  instance.deploymentTransaction = () => deployment.deployTransaction ?? null; // Convert undefined to null to conform to ethers.js types.

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

      if (updatedTxHash !== undefined && updatedTxHash !== deployment.txHash) {
        const updatedTx = await hre.ethers.provider.getTransaction(updatedTxHash);
        // @ts-ignore Won't be readonly because instance was created through attach.
        instance.deploymentTransaction = () => updatedTx;
      }

      return await origWait();
    };
  }
  return instance;
}
