import { getAdminAddress, getImplementationAddress, getBeaconAddress } from '@openzeppelin/upgrades-core';
import { wrapWithProvider } from './utils/wrap-provider';

export const erc1967 = {
  getAdminAddress: wrapWithProvider(getAdminAddress),
  getImplementationAddress: wrapWithProvider(getImplementationAddress),
  getBeaconAddress: wrapWithProvider(getBeaconAddress),
};
