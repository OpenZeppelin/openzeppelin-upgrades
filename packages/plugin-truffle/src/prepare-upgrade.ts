import { setProxyKind } from '@openzeppelin/upgrades-core';

import { ContractClass, wrapProvider, deployImpl, Options, withDefaults } from './utils';

export async function prepareUpgrade(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);

  requiredOpts.kind = await setProxyKind(provider, proxyAddress, opts);

  return await deployImpl(Contract, requiredOpts, proxyAddress);
}
