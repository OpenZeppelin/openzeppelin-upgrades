import {
  assertNotProxy,
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  getImplementationAddress,
  getImplementationAddressFromBeacon,
  getStorageLayoutForAddress,
  Manifest,
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

async function processBeaconImpl(deployData: DeployData, beaconAddress: string) {
  // upgrade scenario
  await assertNotProxy(deployData.provider, beaconAddress);
  return await getImplementationAddressFromBeacon(deployData.provider, beaconAddress);
}

export async function validateImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  currentImplAddress?: string,
): Promise<void> {
  assertUpgradeSafe(deployData.validations, deployData.version, deployData.fullOpts);

  if (currentImplAddress !== undefined) {
    const manifest = await Manifest.forNetwork(deployData.provider);
    const currentLayout = await getStorageLayoutForAddress(manifest, deployData.validations, currentImplAddress);
    if (opts.unsafeSkipStorageCheck !== true) {
      assertStorageUpgradeSafe(currentLayout, deployData.layout, deployData.fullOpts);
    }
  }
}

export async function validateProxyImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  proxyAddress?: string,
): Promise<void> {
  const currentImplAddress = await processProxyImpl(deployData, proxyAddress, opts);
  return validateImpl(deployData, opts, currentImplAddress);
}

export async function validateBeaconImpl(
  deployData: DeployData,
  opts: ValidationOptions,
  beaconAddress?: string,
): Promise<void> {
  const currentImplAddress =
    beaconAddress !== undefined ? await processBeaconImpl(deployData, beaconAddress) : undefined;
  return validateImpl(deployData, opts, currentImplAddress);
}
