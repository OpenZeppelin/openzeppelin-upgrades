import { fetchOrDeploy, fetchOrDeployAdmin, hashBytecode, logWarning } from '@openzeppelin/upgrades-core';
import type { ContractFactory } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployData, getDeployData } from './deploy-impl';
import { Options } from './options';

// To import an already deployed contract we want to reuse fetchOrDeploy for its ability to validate
// a deployment and record it in the network file. We are able to do this by "simulating" a deployment:
// for the "deploy" part we pass a function that simply returns the contract to be imported, rather than
// actually deploying something.

export async function simulateDeployAdmin(
  hre: HardhatRuntimeEnvironment,
  ProxyAdminFactory: ContractFactory,
  opts: Options,
  adminAddress: string,
  adminBytecode: string,
) {
  const { deployData, simulateDeploy } = await simulateDeployment(
    hre,
    ProxyAdminFactory,
    opts,
    adminAddress,
    adminBytecode,
  );
  const manifestAdminAddress = await fetchOrDeployAdmin(deployData.provider, simulateDeploy, opts);
  if (adminAddress !== manifestAdminAddress) {
    logWarning(
      `Imported proxy with admin at '${adminAddress}' which differs from previously deployed admin '${manifestAdminAddress}'`,
      [
        `The imported proxy admin is different from the proxy admin that was previously deployed on this network. This proxy will not be upgradable directly by the plugin.`,
        `To upgrade this proxy, use the prepareUpgrade or defender.proposeUpgrade function and then upgrade it using the admin at '${adminAddress}'.`,
      ],
    );
  }
}

export async function simulateDeployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  implAddress: string,
  runtimeBytecode: string,
) {
  const { deployData, simulateDeploy } = await simulateDeployment(hre, ImplFactory, opts, implAddress, runtimeBytecode);
  await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}

async function simulateDeployment(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: Options,
  implAddress: string,
  runtimeBytecode?: string,
) {
  const deployData = await getDeployData(hre, ImplFactory, opts);
  const simulateDeploy = await getSimulateDeploy(
    deployData,
    ImplFactory,
    implAddress,
    runtimeBytecode && hashBytecode(runtimeBytecode),
  );
  return { deployData, simulateDeploy };
}

/**
 * Gets a function that returns a simulated deployment of the given contract to the given address.
 */
async function getSimulateDeploy(
  deployData: DeployData,
  contractFactory: ContractFactory,
  addr: string,
  bytecodeHash?: string,
) {
  const simulateDeploy = async () => {
    const abi = contractFactory.interface.format(FormatTypes.minimal) as string[];
    const deployment = Object.assign({ abi });
    return { ...deployment, layout: deployData.layout, address: addr, bytecodeHash };
  };
  return simulateDeploy;
}
