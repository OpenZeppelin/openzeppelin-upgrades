import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  inferProxyKind,
  ValidateUpdateRequiresKindError,
} from '@openzeppelin/upgrades-core';

import type { ContractInfo, EngineBinding } from './binding.js';
import { getDeployData } from './deploy-impl.js';
import { validateBeaconImpl, validateImpl, validateProxyImpl } from './validate-impl.js';
import type { ValidateImplementationOptions, ValidateUpgradeOptions } from './options.js';

export async function validateImplementation(
  binding: EngineBinding,
  implInfo: ContractInfo,
  opts: ValidateImplementationOptions,
): Promise<void> {
  const deployData = await getDeployData(binding, implInfo, opts);
  await validateImpl(deployData, opts);
}

/**
 * The reference for `validateUpgrade`: either an original implementation's contract identity
 * (the contracts-only form) or the address of a deployed proxy, beacon, or implementation.
 */
export type UpgradeReference = { kind: 'info'; info: ContractInfo } | { kind: 'address'; address: string };

export async function validateUpgrade(
  binding: EngineBinding,
  reference: UpgradeReference,
  newImplInfo: ContractInfo,
  opts: ValidateUpgradeOptions,
): Promise<void> {
  if (reference.kind === 'info') {
    const origDeployData = await getDeployData(binding, reference.info, opts);
    if (opts.kind === undefined) {
      opts.kind = inferProxyKind(origDeployData.validations, origDeployData.version);
    }

    const newDeployData = await getDeployData(binding, newImplInfo, opts);
    assertUpgradeSafe(newDeployData.validations, newDeployData.version, newDeployData.fullOpts);

    if (opts.unsafeSkipStorageCheck !== true) {
      assertStorageUpgradeSafe(origDeployData.layout, newDeployData.layout, newDeployData.fullOpts);
    }
  } else {
    const referenceAddress = reference.address;
    const provider = binding.provider;
    const deployData = await getDeployData(binding, newImplInfo, opts);
    if (await isTransparentOrUUPSProxy(provider, referenceAddress)) {
      await validateProxyImpl(deployData, opts, referenceAddress);
    } else if (await isBeaconProxy(provider, referenceAddress)) {
      const beaconAddress = await getBeaconAddress(provider, referenceAddress);
      await validateBeaconImpl(deployData, opts, beaconAddress);
    } else if (await isBeacon(provider, referenceAddress)) {
      await validateBeaconImpl(deployData, opts, referenceAddress);
    } else {
      if (opts.kind === undefined) {
        throw new ValidateUpdateRequiresKindError();
      }
      await validateImpl(deployData, opts, referenceAddress);
    }
  }
}
