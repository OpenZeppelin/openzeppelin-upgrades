import { ethers, network, config } from '@nomiclabs/buidler';
import { readArtifact, BuidlerPluginError } from '@nomiclabs/buidler/plugins';
import fs from 'fs';

import { assertUpgradeSafe, getStorageLayout, fetchOrDeploy, getVersionId, Manifest } from '@openzeppelin/upgrades-core';
import { getStorageUpgradeErrors } from '@openzeppelin/upgrades-core';

export async function upgradeProxy(proxyAddress: string, contractName: string) {
  const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

  assertUpgradeSafe(validations, contractName);

  const ProxyFactory = await ethers.getContractFactory('Proxy2');
  const proxy = ProxyFactory.attach(proxyAddress);

  const currentImplAddress = await proxy.implementation();
  const manifest = new Manifest(await ethers.provider.send('eth_chainId', []));
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const storageErrors = getStorageUpgradeErrors(deployment.layout, getStorageLayout(validations, contractName));

  if (storageErrors.length > 0) {
    throw new Error('Storage is incompatible\n' + JSON.stringify(storageErrors, null, 2));
  }

  const ImplFactory = await ethers.getContractFactory(contractName);
  const artifact = await readArtifact(config.paths.artifacts, contractName);
  const version = getVersionId(artifact.deployedBytecode);
  const nextImpl = await fetchOrDeploy(version, network.provider, async () => {
    const { address } = await ImplFactory.deploy();
    const layout = getStorageLayout(validations, contractName);
    return { address, layout };
  });

  await proxy.upgradeTo(nextImpl);

  return ImplFactory.attach(proxyAddress);
}
