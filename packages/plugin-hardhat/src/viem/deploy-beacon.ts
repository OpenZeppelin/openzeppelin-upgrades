import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { makeDeployBeacon as makeEthersDeployBeacon } from '../deploy-beacon.js';
import type { DeployBeaconOptions as EthersDeployBeaconOptions } from '../utils/options.js';
import type { DeployBeaconOptions } from './options.js';
import { getUpgradeableBeaconContract, UpgradeableBeaconContract } from './upgradeable-beacon.js';
import { getContractFactory, toEthersOptions, waitForPendingTransaction } from './utils.js';

export type DeployBeaconFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: DeployBeaconOptions,
) => Promise<UpgradeableBeaconContract>;

export function makeDeployBeacon(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): DeployBeaconFunction {
  const ethersDeployBeacon = makeEthersDeployBeacon(hre, false, connection);

  return async function deployBeacon(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: DeployBeaconOptions = {},
  ): Promise<UpgradeableBeaconContract> {
    const factory = await getContractFactory(connection, contractName, opts);
    const beacon = await ethersDeployBeacon(factory, toEthersOptions<EthersDeployBeaconOptions>(opts));
    await waitForPendingTransaction(beacon);

    return getUpgradeableBeaconContract(connection, (await beacon.getAddress()) as Address, opts.client);
  };
}
