import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import type { ContractFactory } from 'ethers';

import {
  ContractAddressOrInstance,
  getContractAddress,
  deployProxyImpl,
  deployBeaconImpl,
  PrepareUpgradeOptions,
} from './utils/index.js';
import {
  getBeaconAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isBeacon,
  PrepareUpgradeRequiresKindError,
} from '@openzeppelin/upgrades-core';
import { DeployImplementationResponse } from './deploy-implementation.js';
import { enableDefender } from './defender/utils.js';
import { deployUpgradeableImpl, DeployedImpl } from './utils/deploy-impl.js';

export type PrepareUpgradeFunction = (
  referenceAddressOrContract: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: PrepareUpgradeOptions,
) => Promise<DeployImplementationResponse>;

export function makePrepareUpgrade(hre: HardhatRuntimeEnvironment, defenderModule: boolean, connection: NetworkConnection): PrepareUpgradeFunction {
  return async function prepareUpgrade(referenceAddressOrContract, ImplFactory, opts: PrepareUpgradeOptions = {}) {
    opts = enableDefender(hre, defenderModule, opts);

    const deployedImpl = await deployImplForUpgrade(hre, referenceAddressOrContract, ImplFactory, opts, connection);

    if (opts.getTxResponse && deployedImpl.txResponse) {
      return deployedImpl.txResponse;
    } else {
      return deployedImpl.impl;
    }
  };
}

export async function deployImplForUpgrade(
  hre: HardhatRuntimeEnvironment,
  referenceAddressOrContract: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts: PrepareUpgradeOptions = {},
  connection: NetworkConnection,
): Promise<DeployedImpl> {
  const referenceAddress = await getContractAddress(referenceAddressOrContract);
  const { ethers } = connection;
  const provider = ethers.provider;

  let deployedImpl;
  if (await isTransparentOrUUPSProxy(provider, referenceAddress)) {
    deployedImpl = await deployProxyImpl(hre, ImplFactory, opts, referenceAddress, connection);
  } else if (await isBeaconProxy(provider, referenceAddress)) {
    const beaconAddress = await getBeaconAddress(provider, referenceAddress);
    deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, beaconAddress, connection);
  } else if (await isBeacon(provider, referenceAddress)) {
    deployedImpl = await deployBeaconImpl(hre, ImplFactory, opts, referenceAddress, connection);
  } else {
    if (opts.kind === undefined) {
      throw new PrepareUpgradeRequiresKindError();
    }
    deployedImpl = await deployUpgradeableImpl(hre, ImplFactory, opts, referenceAddress, connection);
  }
  return deployedImpl;
}
