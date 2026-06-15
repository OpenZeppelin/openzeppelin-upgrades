import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, ethers } from 'ethers';

import { ContractAddressOrInstance, getContractAddress, PrepareUpgradeOptions } from './utils/index.js';
import { DeployImplementationResponse } from './deploy-implementation.js';
import { enableDefender } from './defender/utils.js';
import { deployImplForUpgrade as engineDeployImplForUpgrade } from './engine/prepare-upgrade.js';
import { makeEthersBinding, contractInfo, txResponseOf } from './ethers-binding.js';

export type PrepareUpgradeFunction = (
  referenceAddressOrContract: ContractAddressOrInstance,
  ImplFactory: ContractFactory,
  opts?: PrepareUpgradeOptions,
) => Promise<DeployImplementationResponse>;

/** Implementation deployment for an upgrade, with the ethers transaction response for `getTxResponse`. */
export interface DeployedImpl {
  impl: string;
  txResponse?: ethers.TransactionResponse;
}

export function makePrepareUpgrade(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): PrepareUpgradeFunction {
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
  const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
  const deployedImpl = await engineDeployImplForUpgrade(binding, referenceAddress, contractInfo(ImplFactory), opts);

  const txResponse = opts.getTxResponse ? await txResponseOf(deployedImpl.deployment, connection) : undefined;
  return { impl: deployedImpl.impl, txResponse };
}
