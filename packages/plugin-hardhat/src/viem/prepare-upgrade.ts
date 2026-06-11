import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { makePrepareUpgrade as makeEthersPrepareUpgrade } from '../prepare-upgrade.js';
import type { PrepareUpgradeOptions as EthersPrepareUpgradeOptions } from '../utils/options.js';
import type { PrepareUpgradeOptions } from './options.js';
import { ContractAddressOrInstance, getContractAddress, getContractFactory, toEthersOptions } from './utils.js';

export type PrepareUpgradeFunction = (
  proxyOrBeacon: ContractAddressOrInstance,
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: PrepareUpgradeOptions,
) => Promise<Address>;

export function makePrepareUpgrade(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): PrepareUpgradeFunction {
  const ethersPrepareUpgrade = makeEthersPrepareUpgrade(hre, false, connection);

  return async function prepareUpgrade(
    proxyOrBeacon: ContractAddressOrInstance,
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: PrepareUpgradeOptions = {},
  ): Promise<Address> {
    const factory = await getContractFactory(connection, contractName, opts);
    const deployed = await ethersPrepareUpgrade(
      getContractAddress(proxyOrBeacon),
      factory,
      toEthersOptions<EthersPrepareUpgradeOptions>(opts),
    );
    // The ethers-based function only returns a transaction response if the getTxResponse
    // option is set, which the viem-based API does not expose.
    return deployed as Address;
  };
}
