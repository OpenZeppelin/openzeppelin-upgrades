import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractFactory } from 'ethers';

import { ContractAddressOrInstance, getContractAddress } from './utils';
import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  ValidateUpgradeUnsupportedError,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import { validateBeaconImpl, validateProxyImpl } from './utils/validate-impl';
import { getDeployData } from './utils/deploy-impl';

export interface ValidateUpgradeFunction {
  (origImplFactory: ContractFactory, newImplFactory: ContractFactory, opts?: ValidationOptions): Promise<void>;
  (
    proxyOrBeaconAddress: ContractAddressOrInstance,
    newImplFactory: ContractFactory,
    opts?: ValidationOptions,
  ): Promise<void>;
}

export function makeValidateUpgrade(hre: HardhatRuntimeEnvironment): ValidateUpgradeFunction {
  return async function validateUpgrade(
    addressOrImplFactory: ContractAddressOrInstance | ContractFactory,
    newImplFactory: ContractFactory,
    opts: ValidationOptions = {},
  ) {
    if (addressOrImplFactory instanceof ContractFactory) {
      const newDeployData = await getDeployData(hre, newImplFactory, opts);
      assertUpgradeSafe(newDeployData.validations, newDeployData.version, newDeployData.fullOpts);

      const origDeployData = await getDeployData(hre, addressOrImplFactory, opts);
      if (opts.unsafeSkipStorageCheck !== true) {
        assertStorageUpgradeSafe(origDeployData.layout, newDeployData.layout, newDeployData.fullOpts);
      }
    } else {
      const proxyOrBeaconAddress = getContractAddress(addressOrImplFactory);
      const { provider } = hre.network;
      const deployData = await getDeployData(hre, newImplFactory, opts);
      if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
        await validateProxyImpl(deployData, opts, proxyOrBeaconAddress);
      } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
        const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
        await validateBeaconImpl(deployData, opts, beaconAddress);
      } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
        await validateBeaconImpl(deployData, opts, proxyOrBeaconAddress);
      } else {
        throw new ValidateUpgradeUnsupportedError(proxyOrBeaconAddress);
      }
    }
  };
}
