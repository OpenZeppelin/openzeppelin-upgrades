import { fetchOrDeploy } from '@openzeppelin/upgrades-core';
import type { ContractFactory } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import { getDeployData } from './deploy-impl.js';
import { UpgradeOptions } from './options.js';

// To import an already deployed contract we want to reuse fetchOrDeploy for its ability to validate
// a deployment and record it in the network file. We are able to do this by "simulating" a deployment:
// for the "deploy" part we pass a function that simply returns the contract to be imported, rather than
// actually deploying something.

export async function simulateDeployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
  implAddress: string,
  connection: NetworkConnection,
) {
  const { deployData, simulateDeploy } = await getSimulatedData(hre, ImplFactory, opts, implAddress, connection);
  await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}

/**
 * Gets data for a simulated deployment of the given contract to the given address.
 */
async function getSimulatedData(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
  implAddress: string,
  connection: NetworkConnection,
) {
  const deployData = await getDeployData(hre, ImplFactory, opts, connection);
  const simulateDeploy = async () => {
    return {
      abi: ImplFactory.interface.format(true),
      layout: deployData.layout,
      address: implAddress,
    };
  };
  return { deployData, simulateDeploy };
}
