import { Manifest, DeploymentNotFound } from '@openzeppelin/upgrades-core';

import { ContractClass, wrapProvider, deployImpl, Options, withDefaults } from './utils';

export async function prepareUpgrade(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<string> {
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  if (requiredOpts.kind === 'auto') {
    try {
      const { kind } = await manifest.getProxyFromAddress(proxyAddress);
      requiredOpts.kind = kind;
    } catch (e) {
      if (e instanceof DeploymentNotFound) {
        requiredOpts.kind = 'transparent';
      } else {
        throw e;
      }
    }
  }

  return await deployImpl(Contract, requiredOpts, proxyAddress);
}
