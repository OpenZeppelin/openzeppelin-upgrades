import { fetchOrDeploy, logWarning, fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { getDeployData } from './deploy-impl';
import { UpgradeOptions } from './options';
import { ContractClass } from './truffle';

// To import an already deployed contract we want to reuse fetchOrDeploy for its ability to validate
// a deployment and record it in the network file. We are able to do this by "simulating" a deployment:
// for the "deploy" part we pass a function that simply returns the contract to be imported, rather than
// actually deploying something.

export async function simulateDeployAdmin(
  ProxyAdminFactory: ContractClass,
  opts: UpgradeOptions,
  adminAddress: string,
) {
  const { deployData, simulateDeploy } = await getSimulatedData(ProxyAdminFactory, opts, adminAddress);
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

export async function simulateDeployImpl(Contract: ContractClass, opts: UpgradeOptions, implAddress: string) {
  const { deployData, simulateDeploy } = await getSimulatedData(Contract, opts, implAddress);
  await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}

async function getSimulatedData(Contract: ContractClass, opts: UpgradeOptions, implAddress: string) {
  const deployData = await getDeployData(opts, Contract);
  const simulateDeploy = async () => {
    return {
      abi: (Contract as any).abi,
      layout: deployData.layout,
      address: implAddress,
    };
  };
  return { deployData, simulateDeploy };
}
