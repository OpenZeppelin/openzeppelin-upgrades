import { ethers, network, config } from '@nomiclabs/buidler';
import { readArtifact, BuidlerPluginError } from '@nomiclabs/buidler/plugins';
import fs from 'fs';
import type { ContractFactory } from 'ethers';

import { assertUpgradeSafe, assertStorageUpgradeSafe, getStorageLayout, fetchOrDeploy, getVersionId, Manifest } from '@openzeppelin/upgrades-core';

import { getProxyFactory } from './proxy-factory';

export async function upgradeProxy(proxyAddress: string, ImplFactory: ContractFactory) {
  const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

  const version = getVersionId(ImplFactory.bytecode);
  assertUpgradeSafe(validations, version);

  const ProxyFactory = await getProxyFactory(ImplFactory.signer);
  const proxy = ProxyFactory.attach(proxyAddress);

  const signer = await ImplFactory.signer.getAddress()

  const currentImplAddress = await proxy.callStatic.implementation({ from: signer });
  const manifest = new Manifest(await ethers.provider.send('eth_chainId', []));
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout);

  const nextImpl = await fetchOrDeploy(version, network.provider, async () => {
    const { address } = await ImplFactory.deploy();
    return { address, layout };
  });

  await proxy.upgradeTo(nextImpl);

  return ImplFactory.attach(proxyAddress);
}
