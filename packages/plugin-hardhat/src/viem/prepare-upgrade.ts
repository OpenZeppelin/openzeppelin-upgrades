import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { deployImplForUpgrade as engineDeployImplForUpgrade } from '../engine/prepare-upgrade.js';
import type { PrepareUpgradeOptions } from './options.js';
import { asAddress, ContractAddressOrInstance, getContractAddress, getContractInfo, makeBinding } from './utils.js';

export type PrepareUpgradeFunction = (
  proxyOrBeacon: ContractAddressOrInstance,
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: PrepareUpgradeOptions,
) => Promise<Address>;

export function makePrepareUpgrade(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): PrepareUpgradeFunction {
  return async function prepareUpgrade(
    proxyOrBeacon: ContractAddressOrInstance,
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: PrepareUpgradeOptions = {},
  ): Promise<Address> {
    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    const deployed = await engineDeployImplForUpgrade(binding, getContractAddress(proxyOrBeacon), implInfo, opts);
    return asAddress(deployed.impl);
  };
}
