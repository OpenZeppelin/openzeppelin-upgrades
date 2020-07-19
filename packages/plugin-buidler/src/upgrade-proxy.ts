import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersionId,
  Manifest,
  getImplementationAddress,
  getChainId,
} from '@openzeppelin/upgrades-core';

import { getProxyFactory } from './proxy-factory';
import fs from 'fs';

export type UpgradeFunction = (proxyAddress: string, ImplFactory: ContractFactory) => Promise<Contract>;

export function makeUpgradeProxy(bre: BuidlerRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress: string, ImplFactory: ContractFactory): Promise<Contract> {
    const { provider } = bre.network;
    const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

    const version = getVersionId(ImplFactory.bytecode);
    assertUpgradeSafe(validations, version);

    const ProxyFactory = await getProxyFactory(bre, ImplFactory.signer);
    const proxy = ProxyFactory.attach(proxyAddress);

    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const manifest = new Manifest(await getChainId(provider));
    const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

    const layout = getStorageLayout(validations, version);
    assertStorageUpgradeSafe(deployment.layout, layout);

    const nextImpl = await fetchOrDeploy(version, provider, async () => {
      const { address } = await ImplFactory.deploy();
      return { address, layout };
    });

    await proxy.upgradeTo(nextImpl);

    return ImplFactory.attach(proxyAddress);
  };
}
