import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Manifest,
  ValidationOptions,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  fetchOrDeploy,
  getImplementationAddress,
  getStorageLayout,
  getStorageLayoutForAddress,
  getUnlinkedBytecode,
  getVersion,
  inferProxyKind,
  withValidationDefaults,
  setProxyKind,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { readValidations } from './validations';

interface DeployedImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
}

export async function deployImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: ValidationOptions,
  proxyAddress?: string,
): Promise<DeployedImpl> {
  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);
  const layout = getStorageLayout(validations, version);

  if (opts.kind === undefined) {
    opts.kind = inferProxyKind(validations, version);
  }

  if (proxyAddress !== undefined) {
    await setProxyKind(provider, proxyAddress, opts);
  }

  const fullOpts = withValidationDefaults(opts);

  assertUpgradeSafe(validations, version, fullOpts);

  if (proxyAddress !== undefined) {
    const manifest = await Manifest.forNetwork(provider);
    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, fullOpts);
  }

  const impl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(ImplFactory);
    return { ...deployment, layout };
  });

  return { impl, kind: opts.kind };
}
