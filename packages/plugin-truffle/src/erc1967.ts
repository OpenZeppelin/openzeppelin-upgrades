import { getAdminAddress, getImplementationAddress, getBeaconAddress } from '@openzeppelin/upgrades-core';
import { wrapProvider, Options, withDefaults } from './utils';

export const erc1967 = {
  getAdminAddress: async function (proxyAddress: string, opts: Options = {}): Promise<string> {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getAdminAddress(provider, proxyAddress);
  },
  getImplementationAddress: async function (proxyAddress: string, opts: Options = {}): Promise<string> {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getImplementationAddress(provider, proxyAddress);
  },
  getBeaconAddress: async function (proxyAddress: string, opts: Options = {}): Promise<string> {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getBeaconAddress(provider, proxyAddress);
  },
};
