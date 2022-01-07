import { getImplementationAddressFromBeacon } from '@openzeppelin/upgrades-core';
import { wrapWithProvider } from './utils/wrap-provider';

export const beacon = {
  getImplementationAddress: wrapWithProvider(getImplementationAddressFromBeacon),
};
