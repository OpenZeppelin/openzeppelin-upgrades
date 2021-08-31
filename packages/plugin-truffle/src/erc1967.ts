import {
  EthereumProvider,
  getAdminAddress,
  getImplementationAddress,
  getBeaconAddress,
} from '@openzeppelin/upgrades-core';

import { wrapProvider, Options, withDefaults } from './utils';

function wrapWithProvider<A, R>(getter: (provider: EthereumProvider, args: A) => R): (args: A, opts: Options) => R {
  return (args: A, opts?: Options) => {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getter(provider, args);
  };
}

export const erc1967 = {
  getAdminAddress: wrapWithProvider(getAdminAddress),
  getImplementationAddress: wrapWithProvider(getImplementationAddress),
  getBeaconAddress: wrapWithProvider(getBeaconAddress),
};
