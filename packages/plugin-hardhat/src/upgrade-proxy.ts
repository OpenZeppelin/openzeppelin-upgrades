import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  getUnlinkedBytecode,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
  getStorageLayoutForAddress,
} from '@openzeppelin/upgrades-core';

import {
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
} from './proxy-factory';

import { readValidations } from './validations';
import { deploy } from './utils/deploy';
import { UpgradeOptions } from './types';

export type PrepareUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: UpgradeOptions,
) => Promise<string>;

export type UpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: UpgradeOptions,
) => Promise<Contract>;

async function prepareUpgradeImpl(
  hre: HardhatRuntimeEnvironment,
  manifest: Manifest,
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
): Promise<string> {

  if (opts.kind === 'transparent') {
    opts.unsafeAllow = opts.unsafeAllow || [];
    opts.unsafeAllow.push('no-public-upgrade-fn');
  }

  const { provider } = hre.network;
  const validations = await readValidations(hre);

  const unlinkedBytecode: string = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
  assertUpgradeSafe(validations, version, opts);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const deploymentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(
    deploymentLayout,
    layout,
    (opts.unsafeAllow || []).includes('struct-definition') || (opts.unsafeAllow || []).includes('enum-definition')
  );

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(ImplFactory);
    return { ...deployment, layout };
  });
}

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    return await prepareUpgradeImpl(hre, manifest, proxyAddress, ImplFactory, opts);
  };
}

export function makeUpgradeProxy(hre: HardhatRuntimeEnvironment): UpgradeFunction {
  return async function upgradeProxy(proxyAddress, ImplFactory, opts = {}) {
    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    // TODO: auto detect kind
    switch(opts.kind) {
      case undefined:
      case 'uups':
      {
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        const proxy = TransparentUpgradeableProxyFactory.attach(proxyAddress);
        const nextImpl = await prepareUpgradeImpl(hre, manifest, proxyAddress, ImplFactory, opts);
        await proxy.upgradeTo(nextImpl);
        break;
      }

      case 'transparent':
      {
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const admin = AdminFactory.attach(await getAdminAddress(provider, proxyAddress));
        const manifestAdmin = await manifest.getAdmin();
        if (admin.address !== manifestAdmin?.address) {
          throw new Error('Proxy admin is not the one registered in the network manifest');
        }
        const nextImpl = await prepareUpgradeImpl(hre, manifest, proxyAddress, ImplFactory, opts);
        await admin.upgrade(proxyAddress, nextImpl);
        break;
      }

      default:
        throw new Error('unknown proxy kind');
    }

    return ImplFactory.attach(proxyAddress);
  };
}
