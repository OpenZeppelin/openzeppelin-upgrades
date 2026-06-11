import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { deployUpgradeableImpl } from '../utils/deploy-impl.js';
import type { StandaloneOptions as EthersStandaloneOptions } from '../utils/options.js';
import type { DeployImplementationOptions } from './options.js';
import { asAddress, getContractFactory, toEthersOptions } from './utils.js';

export type DeployImplementationFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: DeployImplementationOptions,
) => Promise<Address>;

export function makeDeployImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): DeployImplementationFunction {
  return async function deployImplementation(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: DeployImplementationOptions = {},
  ): Promise<Address> {
    const factory = await getContractFactory(connection, contractName, opts);
    const deployed = await deployUpgradeableImpl(
      hre,
      factory,
      toEthersOptions<EthersStandaloneOptions>(opts),
      undefined,
      connection,
    );
    return asAddress(deployed.impl);
  };
}
