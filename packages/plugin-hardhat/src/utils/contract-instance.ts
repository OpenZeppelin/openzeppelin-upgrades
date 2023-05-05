import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';
import assert from 'assert';

import { DeployTransaction, Platform } from '.';
import { waitForDeployment } from '../platform/utils';
import { Deployment, RemoteDeploymentId, DeployOpts } from '@openzeppelin/upgrades-core';

/**
 * Gets a contract instance from a deployment, where the deployment may be remote.
 * If the deployment is remote, the instance have an overriden `deployed` method to wait for the remote deployment
 * and update its `deployTransaction` with the new transaction hash if it was detected to have changed.
 *
 * @param hre The Hardhat Runtime Environment
 * @param contract The contract factory
 * @param opts The deploy and platform options
 * @param deployment The deployment
 * @param deployTransaction The transaction that deployed the contract, if available
 * @returns The contract instance
 */
export function getContractInstance(
  hre: HardhatRuntimeEnvironment,
  contract: ContractFactory,
  opts: DeployOpts & Platform,
  deployment: Deployment & DeployTransaction & RemoteDeploymentId,
) {
  const instance = contract.attach(deployment.address);

  // @ts-ignore Won't be readonly because instance was created through attach.
  instance.deployTransaction = deployment.deployTransaction;

  if (opts.usePlatformDeploy && deployment.remoteDeploymentId !== undefined) {
    const origDeployed = instance.deployed.bind(instance);
    instance.deployed = async () => {
      assert(deployment.remoteDeploymentId !== undefined);
      const updatedTxHash = await waitForDeployment(hre, opts, instance.address, deployment.remoteDeploymentId);

      if (updatedTxHash !== undefined && updatedTxHash !== deployment.txHash) {
        // @ts-ignore Won't be readonly because instance was created through attach.
        instance.deployTransaction = await hre.ethers.provider.getTransaction(updatedTxHash);
      }

      return await origDeployed();
    };
  }
  return instance;
}
