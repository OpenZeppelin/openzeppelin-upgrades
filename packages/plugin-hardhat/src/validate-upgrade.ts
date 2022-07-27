import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractFactory } from 'ethers';

import { ContractAddressOrInstance, getContractAddress } from './utils';
import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import { validateBeaconImpl, validateImpl, validateProxyImpl } from './utils/validate-impl';
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
      const address = getContractAddress(addressOrImplFactory);
      const { provider } = hre.network;
      const deployData = await getDeployData(hre, newImplFactory, opts);
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
  };
}
