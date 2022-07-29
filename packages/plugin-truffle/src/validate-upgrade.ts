import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  getBeaconAddress,
  inferProxyKind,
  isBeacon,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  ValidateUpdateRequiresKindError,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import {
  ContractClass,
  ContractAddressOrInstance,
  getContractAddress,
  withDefaults,
  wrapProvider,
  getDeployData,
} from './utils';
import { validateBeaconImpl, validateImpl, validateProxyImpl } from './utils/validate-impl';

function isContractClass(object: any): object is ContractClass {
  return typeof object !== 'string' && 'bytecode' in object;
}

export async function validateUpgrade(
  referenceAddressOrContract: ContractAddressOrInstance | ContractClass,
  newContract: ContractClass,
  opts: ValidationOptions = {},
): Promise<void> {
  if (isContractClass(referenceAddressOrContract)) {
    const origDeployData = await getDeployData(opts, referenceAddressOrContract);
    if (opts.kind === undefined) {
      opts.kind = inferProxyKind(origDeployData.validations, origDeployData.version);
    }

    const newDeployData = await getDeployData(opts, newContract);
    assertUpgradeSafe(newDeployData.validations, newDeployData.version, newDeployData.fullOpts);

    if (opts.unsafeSkipStorageCheck !== true) {
      assertStorageUpgradeSafe(origDeployData.layout, newDeployData.layout, newDeployData.fullOpts);
    }
  } else {
    const referenceAddress = getContractAddress(referenceAddressOrContract);
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    const deployData = await getDeployData(opts, newContract);
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
