import {
  Manifest,
  getAdminAddress,
} from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deployImpl,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  Options,
  withDefaults,
} from './utils';

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const requiredOpts: Required<Options> = withDefaults(opts);

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const manifest = await Manifest.forNetwork(provider);

  // Autodetect proxy type
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  if (requiredOpts.kind === 'auto') {
    requiredOpts.kind = adminAddress === '0x0000000000000000000000000000000000000000' ? 'uups' : 'transparent';
  }

  switch(requiredOpts.kind) {
    case 'uups':
    {
      // Use TransparentUpgradeableProxyFactory to get proxiable interface
      const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
      const proxy = new TransparentUpgradeableProxyFactory(proxyAddress);
      const nextImpl = await deployImpl(Contract, requiredOpts, { proxyAddress, manifest});
      await proxy.upgradeTo(nextImpl);
      break;
    }

    case 'transparent':
    {
      const AdminFactory = getProxyAdminFactory(Contract);
      const admin = new AdminFactory(adminAddress);
      const manifestAdmin = await manifest.getAdmin();
      if (admin.address !== manifestAdmin?.address) {
        throw new Error('Proxy admin is not the one registered in the network manifest');
      }

      const nextImpl = await deployImpl(Contract, requiredOpts, { proxyAddress, manifest});
      await admin.upgrade(proxyAddress, nextImpl);
      break;
    }
  }

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}
