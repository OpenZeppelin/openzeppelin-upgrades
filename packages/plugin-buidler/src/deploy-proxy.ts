import { ethers, network, config } from '@nomiclabs/buidler';
import { readArtifact, BuidlerPluginError } from '@nomiclabs/buidler/plugins';
import fs from 'fs';

import { isUpgradeSafe, getErrors, getStorageLayout, fetchOrDeploy, getVersionId } from '@openzeppelin/upgrades-core';

export async function deployProxy(contractName: string, args: unknown[]) {
  const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

  if (!isUpgradeSafe(validations, contractName)) {
    for (const error of getErrors(validations, contractName)) {
      console.log(`There is a ${error.kind} in the contract`);
    }
    throw new BuidlerPluginError('This contract is not upgrade safe');
  }

  const ImplFactory = await ethers.getContractFactory(contractName);

  const artifact = await readArtifact(config.paths.artifacts, contractName);
  const version = getVersionId(artifact.deployedBytecode);
  const impl = await fetchOrDeploy(version, network.provider, async () => {
    const { address } = await ImplFactory.deploy();
    const layout = getStorageLayout(validations, contractName);
    return { address, layout };
  });

  // TODO: support choice of initializer function? support overloaded initialize function
  const data = ImplFactory.interface.functions.initialize.encode(args);
  const ProxyFactory = await ethers.getContractFactory('UpgradeabilityProxy');
  const proxy = await ProxyFactory.deploy(impl, data);

  const inst = ImplFactory.attach(proxy.address);
  // inst.deployTransaction = proxy.deployTransaction;
  return inst;
}
