import { Manifest, getAdminAddress, setProxyKind, getCode } from '@openzeppelin/upgrades-core';

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

  requiredOpts.kind = await setProxyKind(provider, proxyAddress, opts);

  const adminAddress = await getAdminAddress(provider, proxyAddress);
  const adminBytecode = await getCode(provider, adminAddress);

  if (adminBytecode === '0x') {
    // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
    const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(Contract);
    const proxy = new TransparentUpgradeableProxyFactory(proxyAddress);
    const nextImpl = await deployImpl(Contract, requiredOpts, proxyAddress);
    await proxy.upgradeTo(nextImpl);
  } else {
    // Admin contract: redirect upgrade call through it
    const AdminFactory = getProxyAdminFactory(Contract);
    const admin = new AdminFactory(adminAddress);
    const manifestAdmin = await manifest.getAdmin();
    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    }

    const nextImpl = await deployImpl(Contract, requiredOpts, proxyAddress);
    await admin.upgrade(proxyAddress, nextImpl);
  }

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}
