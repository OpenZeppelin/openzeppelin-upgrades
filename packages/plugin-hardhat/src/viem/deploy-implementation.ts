import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { makeDeployImplementation as makeEthersDeployImplementation } from '../deploy-implementation.js';
import type { DeployImplementationOptions as EthersDeployImplementationOptions } from '../utils/options.js';
import type { DeployImplementationOptions } from './options.js';
import { getContractFactory, toEthersOptions } from './utils.js';

export type DeployImplementationFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: DeployImplementationOptions,
) => Promise<Address>;

export function makeDeployImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): DeployImplementationFunction {
  const ethersDeployImplementation = makeEthersDeployImplementation(hre, false, connection);

  return async function deployImplementation(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: DeployImplementationOptions = {},
  ): Promise<Address> {
    const factory = await getContractFactory(connection, contractName, opts);
    const deployed = await ethersDeployImplementation(
      factory,
      toEthersOptions<EthersDeployImplementationOptions>(opts),
    );
    // The ethers-based function only returns a transaction response if the getTxResponse
    // option is set, which the viem-based API does not expose.
    return deployed as Address;
  };
}
