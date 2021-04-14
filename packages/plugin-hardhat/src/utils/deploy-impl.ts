import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  getUnlinkedBytecode,
  Manifest,
  getImplementationAddress,
  getStorageLayoutForAddress,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options } from './options';
import { readValidations } from './validations';

export async function deployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  requiredOpts: Required<Options>,
  proxyAddress?: string,
): Promise<string> {
  if (requiredOpts.kind === 'transparent') {
    requiredOpts.unsafeAllow.push('no-public-upgrade-fn');
  }

  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
  const layout = getStorageLayout(validations, version);
  assertUpgradeSafe(validations, version, requiredOpts);

  if (proxyAddress !== undefined) {
    const manifest = await Manifest.forNetwork(provider);
    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const deploymentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(deploymentLayout, layout, requiredOpts.unsafeAllowCustomTypes);
  }

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(ImplFactory);
    return { ...deployment, layout };
  });
}
