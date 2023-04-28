import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  ContractAddressOrInstance,
  getContractAddress,
  deployProxyImpl,
  deployBeaconImpl,
  PrepareUpgradeOptions,
} from './utils';
import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  PrepareUpgradeUnsupportedError,
} from '@openzeppelin/upgrades-core';
import { DeployImplementationResponse } from './deploy-implementation';
import { withPlatformDefaults } from './platform/utils';

export type PrepareUpgradeFunction = (
  proxyOrBeaconAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: PrepareUpgradeOptions,
) => Promise<DeployImplementationResponse>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment, platformModule: boolean): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyOrBeacon, ImplFactory, opts: PrepareUpgradeOptions = {}) {
    const withOpts = withPlatformDefaults(hre, platformModule, opts);

    const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);
    const { provider } = hre.network;
    let deployedImpl;
    if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
      deployedImpl = await deployProxyImpl(hre, ImplFactory, withOpts, proxyOrBeaconAddress);
    } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
      const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, withOpts, beaconAddress);
    } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, withOpts, proxyOrBeaconAddress);
    } else {
      throw new PrepareUpgradeUnsupportedError(proxyOrBeaconAddress);
    }

    if (withOpts.getTxResponse && deployedImpl.txResponse !== undefined) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}
