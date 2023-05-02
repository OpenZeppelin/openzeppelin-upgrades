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
import { enablePlatform } from './platform/utils';
import { DeployedBeaconImpl, DeployedProxyImpl } from './utils/deploy-impl';

export type PrepareUpgradeFunction = (
  proxyOrBeaconAddress: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: PrepareUpgradeOptions,
) => Promise<DeployImplementationResponse>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment, platformModule: boolean): PrepareUpgradeFunction {
  return async function prepareUpgrade(proxyOrBeacon, ImplFactory, opts: PrepareUpgradeOptions = {}) {
    opts = enablePlatform(hre, platformModule, opts);

    const deployedImpl = await deployImplForUpgrade(hre, proxyOrBeacon, ImplFactory, opts);

    if (opts.getTxResponse && deployedImpl.txResponse !== undefined) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}

export async function deployImplForUpgrade(
  hre: HardhatRuntimeEnvironment,
  proxyOrBeacon: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts: PrepareUpgradeOptions = {},
): Promise<DeployedProxyImpl | DeployedBeaconImpl> {
  const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);
  const { provider } = hre.network;
  let deployedImpl;
  if (await isTransparentOrUUPSProxy(provider, proxyOrBeaconAddress)) {
    deployedImpl = await deployProxyImpl(hre, ImplFactory, opts, proxyOrBeaconAddress);
  } else if (await isBeaconProxy(provider, proxyOrBeaconAddress)) {
    const beaconAddress = await getBeaconAddress(provider, proxyOrBeaconAddress);
    deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress);
  } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
    deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, proxyOrBeaconAddress);
  } else {
    throw new PrepareUpgradeUnsupportedError(proxyOrBeaconAddress);
  }
  return deployedImpl;
}
