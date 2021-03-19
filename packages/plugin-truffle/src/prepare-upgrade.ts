import {
  Manifest,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  wrapProvider,
  deployImpl,
  Options,
  withDefaults,
} from './utils';

export async function prepareUpgrade(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  // Autodetect proxy type
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  if (requiredOpts.kind === 'auto') {
    requiredOpts.kind = adminAddress === '0x0000000000000000000000000000000000000000' ? 'uups' : 'transparent';
  }

  return await deployImpl(Contract, requiredOpts, { proxyAddress, manifest});
}
