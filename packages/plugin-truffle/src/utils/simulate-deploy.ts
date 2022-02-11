import { fetchOrDeploy, logWarning, fetchOrDeployAdmin, hashBytecode } from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { DeployData, getDeployData } from './deploy-impl';
import { Options } from './options';
import { ContractClass } from './truffle';

export async function simulateDeployAdmin(
  ProxyAdminFactory: ContractClass,
  opts: Options,
  adminAddress: string,
  adminBytecode: string,
) {
  const { deployData, simulateDeploy } = await simulateDeployment(ProxyAdminFactory, opts, adminAddress, adminBytecode);
  const manifestAdminAddress = await fetchOrDeployAdmin(deployData.provider, simulateDeploy, opts);
  if (adminAddress !== manifestAdminAddress) {
    logWarning(
      `Imported proxy with admin at '${adminAddress}' which differs from previously deployed admin '${manifestAdminAddress}'`,
      [
        `The imported proxy admin is different from the proxy admin that was previously deployed on this network. This proxy will not be upgradable directly by the plugin.`,
        `To upgrade this proxy, use the prepareUpgrade function and then upgrade it using the admin at '${adminAddress}'.`,
      ],
    );
  }
}

export async function simulateDeployImpl(
  Contract: ContractClass,
  opts: Options,
  implAddress: string,
  runtimeBytecode: string,
) {
  const { deployData, simulateDeploy } = await simulateDeployment(Contract, opts, implAddress, runtimeBytecode);
  await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}

async function simulateDeployment(
  Contract: ContractClass,
  opts: Options,
  implAddress: string,
  runtimeBytecode?: string,
) {
  const deployData = await getDeployData(opts, Contract);
  const simulateDeploy = await getSimulateDeploy(
    deployData,
    Contract,
    implAddress,
    runtimeBytecode && hashBytecode(runtimeBytecode),
  );
  return { deployData, simulateDeploy };
}

/**
 * Gets a function that returns a simulated deployment of the given contract to the given address.
 */
async function getSimulateDeploy(deployData: DeployData, Contract: ContractClass, addr: string, bytecodeHash?: string) {
  const simulateDeploy = async () => {
    const abi = (Contract as any).abi;
    const deployment = Object.assign(
      { abi },
      await deploy(deployData.fullOpts.deployer, Contract, ...deployData.fullOpts.constructorArgs),
    );
    return { ...deployment, layout: deployData.layout, address: addr, bytecodeHash };
  };
  return simulateDeploy;
}
