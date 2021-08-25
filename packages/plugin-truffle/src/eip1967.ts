import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import { wrapProvider, Options, withDefaults } from './utils';

export const eip1967 = {
  getImplementationAddress: async function(proxyAddress: string, opts: Options = {}) : Promise<string> {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getImplementationAddress(provider, proxyAddress);
  },
};
