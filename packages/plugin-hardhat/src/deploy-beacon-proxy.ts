import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import { ContractFactory } from 'ethers';

import { UpgradesError } from '@openzeppelin/upgrades-core';

import { DeployBeaconProxyOptions, ContractAddressOrInstance, getContractAddress } from './utils/index.js';
import { enableDefender } from './defender/utils.js';
import { getContractInstance } from './utils/contract-instance.js';
import { ContractTypeOfFactory } from './type-extensions.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { deployBeaconProxy as engineDeployBeaconProxy } from './engine/deploy-beacon-proxy.js';

export interface DeployBeaconProxyFunction {
  <F extends ContractFactory>(
    beacon: ContractAddressOrInstance,
    attachTo: F,
    args?: unknown[],
    opts?: DeployBeaconProxyOptions,
  ): Promise<ContractTypeOfFactory<F>>;
  <F extends ContractFactory>(
    beacon: ContractAddressOrInstance,
    attachTo: F,
    opts?: DeployBeaconProxyOptions,
  ): Promise<ContractTypeOfFactory<F>>;
}

export function makeDeployBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): DeployBeaconProxyFunction {
  return async function deployBeaconProxy<F extends ContractFactory>(
    beacon: ContractAddressOrInstance,
    attachTo: F,
    args: unknown[] | DeployBeaconProxyOptions = [],
    opts: DeployBeaconProxyOptions = {},
  ): Promise<ContractTypeOfFactory<F>> {
    if (!(attachTo instanceof ContractFactory)) {
      throw new UpgradesError(
        `attachTo must specify a contract factory`,
        () => `Include the contract factory for the beacon's current implementation in the attachTo parameter`,
      );
    }
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    opts = enableDefender(hre, defenderModule, opts);

    const binding = makeEthersBinding(hre, connection, attachTo.runner, opts);
    const beaconAddress = await getContractAddress(beacon);
    const proxyDeployment = await engineDeployBeaconProxy(
      binding,
      beaconAddress,
      contractInfo(attachTo).abi,
      args,
      opts,
    );

    return getContractInstance(hre, attachTo, opts, proxyDeployment);
  };
}
