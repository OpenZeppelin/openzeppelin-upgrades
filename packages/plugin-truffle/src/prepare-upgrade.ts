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
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);

  const proxyAddress = getContractAddress(proxy);

  requiredOpts.kind = await setProxyKind(provider, proxyAddress, opts);

  return await deployImpl(Contract, requiredOpts, proxyAddress);
}
