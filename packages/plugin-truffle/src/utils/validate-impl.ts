import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  Manifest,
  getImplementationAddress,
  getStorageLayoutForAddress,
  assertNotProxy,
  getImplementationAddressFromBeacon,
  processProxyKind,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';

import { DeployData } from './deploy-impl';

async function processProxyImpl(deployData: DeployData, proxyAddress: string | undefined, opts: ValidationOptions) {
  await processProxyKind(deployData.provider, proxyAddress, opts, deployData.validations, deployData.version);

  let currentImplAddress: string | undefined;
  if (proxyAddress !== undefined) {
    // upgrade scenario
    currentImplAddress = await getImplementationAddress(deployData.provider, proxyAddress);
  }
  return currentImplAddress;
}

async function processBeaconImpl(beaconAddress: string | undefined, deployData: DeployData) {
  let currentImplAddress: string | undefined;
  if (beaconAddress !== undefined) {
    // upgrade scenario
    await assertNotProxy(deployData.provider, beaconAddress);
    currentImplAddress = await getImplementationAddressFromBeacon(deployData.provider, beaconAddress);
  }
  return currentImplAddress;
}

async function validateUpgradeImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  currentImplAddress?: string,
): Promise<void> {
  assertUpgradeSafe([deployData.validations], deployData.version, deployData.fullOpts);

  if (currentImplAddress !== undefined) {
    const manifest = await Manifest.forNetwork(deployData.provider);
    const currentLayout = await getStorageLayoutForAddress(manifest, deployData.validations, currentImplAddress);
    if (opts.unsafeSkipStorageCheck !== true) {
      assertStorageUpgradeSafe(currentLayout, deployData.layout, deployData.fullOpts);
    }
  }
}

export async function validateStandaloneImpl(deployData: DeployData, opts: ValidationOptions): Promise<void> {
  return validateUpgradeImpl(deployData, opts);
}

export async function validateProxyImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  proxyAddress?: string,
): Promise<void> {
  const currentImplAddress = await processProxyImpl(deployData, proxyAddress, opts);
  return validateUpgradeImpl(deployData, opts, currentImplAddress);
}

export async function validateBeaconImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  beaconAddress?: string,
): Promise<void> {
  const currentImplAddress = await processBeaconImpl(beaconAddress, deployData);
  return validateUpgradeImpl(deployData, opts, currentImplAddress);
}