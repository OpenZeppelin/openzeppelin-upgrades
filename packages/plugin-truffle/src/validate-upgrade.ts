import {
  assertStorageUpgradeSafe,
  assertUpgradeSafe,
  getBeaconAddress,
  isBeacon,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
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
  return 'bytecode' in object;
}

export async function validateUpgrade(
  addressOrContract: ContractAddressOrInstance | ContractClass,
  newContract: ContractClass,
  opts: ValidationOptions = {},
): Promise<void> {
  if (isContractClass(addressOrContract)) {
    const newDeployData = await getDeployData(opts, newContract);
    assertUpgradeSafe(newDeployData.validations, newDeployData.version, newDeployData.fullOpts);

    const origDeployData = await getDeployData(opts, addressOrContract);
    if (opts.unsafeSkipStorageCheck !== true) {
      assertStorageUpgradeSafe(origDeployData.layout, newDeployData.layout, newDeployData.fullOpts);
    }
  } else {
    const address = getContractAddress(addressOrContract);
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    const deployData = await getDeployData(opts, newContract);
    if (await isTransparentOrUUPSProxy(provider, address)) {
      await validateProxyImpl(deployData, opts, address);
    } else if (await isBeaconProxy(provider, address)) {
      const beaconAddress = await getBeaconAddress(provider, address);
      await validateBeaconImpl(deployData, opts, beaconAddress);
    } else if (await isBeacon(provider, address)) {
      await validateBeaconImpl(deployData, opts, address);
    } else {
      await validateImpl(deployData, opts, address);
    }
  }
}
