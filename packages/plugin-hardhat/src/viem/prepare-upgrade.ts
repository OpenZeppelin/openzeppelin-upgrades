import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { deployImplForUpgrade } from '../prepare-upgrade.js';
import type { PrepareUpgradeOptions as EthersPrepareUpgradeOptions } from '../utils/options.js';
import type { PrepareUpgradeOptions } from './options.js';
import {
  asAddress,
  ContractAddressOrInstance,
  getContractAddress,
  getContractFactory,
  toEthersOptions,
} from './utils.js';

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
    const factory = await getContractFactory(connection, contractName, opts);
    const deployed = await deployImplForUpgrade(
      hre,
      getContractAddress(proxyOrBeacon),
      factory,
      toEthersOptions<EthersPrepareUpgradeOptions>(opts),
      connection,
    );
    return asAddress(deployed.impl);
  };
}
