import { setProxyKind } from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  wrapProvider,
  deployImpl,
  Options,
  withDefaults,
  ContractAddressOrInstance,
  getContractAddress,
} from './utils';

export async function prepareUpgrade(
  proxy: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const proxyAddress = getContractAddress(proxy);
  const { impl } = await deployImpl(Contract, opts, proxyAddress);
  return impl;
}
