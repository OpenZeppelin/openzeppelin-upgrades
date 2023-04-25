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
  PrepareUpgradeRequiresKindError,
} from '@openzeppelin/upgrades-core';
import { DeployImplementationResponse } from './deploy-implementation';
import { deployUpgradeableImpl } from './utils/deploy-impl';

export type PrepareUpgradeFunction = (
  from: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: PrepareUpgradeOptions,
) => Promise<DeployImplementationResponse>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment): PrepareUpgradeFunction {
  return async function prepareUpgrade(from, ImplFactory, opts: PrepareUpgradeOptions = {}) {
    const fromAddr = getContractAddress(from);
    const { provider } = hre.network;
    let deployedImpl;
    if (await isTransparentOrUUPSProxy(provider, fromAddr)) {
      deployedImpl = await deployProxyImpl(hre, ImplFactory, opts, fromAddr);
    } else if (await isBeaconProxy(provider, fromAddr)) {
      const beaconAddress = await getBeaconAddress(provider, fromAddr);
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress);
    } else if (await isBeacon(provider, fromAddr)) {
      deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, fromAddr);
    } else {
      if (opts.kind === undefined) {
        throw new PrepareUpgradeRequiresKindError();
      }
      deployedImpl = await deployUpgradeableImpl(hre, ImplFactory, opts, fromAddr);
    }

    if (opts.getTxResponse && deployedImpl.txResponse !== undefined) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}
