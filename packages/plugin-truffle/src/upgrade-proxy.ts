import { Manifest, getAdminAddress, getCode, EthereumProvider } from '@openzeppelin/upgrades-core';

import {
  ContractClass,
  ContractInstance,
  wrapProvider,
  deployImpl,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  Options,
  withDefaults,
  getContractAddress,
  ContractAddressOrInstance,
} from './utils';

export async function upgradeProxy(
  proxy: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer } = withDefaults(opts);
  const provider = wrapProvider(deployer.provider);

  const proxyAddress = getContractAddress(proxy);

  const upgradeTo = await getUpgrader(provider, Contract, proxyAddress);
  const { impl: nextImpl } = await deployImpl(Contract, opts, proxyAddress);
  await upgradeTo(nextImpl);

  Contract.address = proxyAddress;
  return new Contract(proxyAddress);
}

type Upgrader = (nextImpl: string) => Promise<void>;

async function getUpgrader(
  provider: EthereumProvider,
  contractTemplate: ContractClass,
  proxyAddress: string,
): Promise<Upgrader> {
  const adminAddress = await getAdminAddress(provider, proxyAddress);
  const adminBytecode = await getCode(provider, adminAddress);

  if (adminBytecode === '0x') {
    // No admin contract: use TransparentUpgradeableProxyFactory to get proxiable interface
    const TransparentUpgradeableProxyFactory = getTransparentUpgradeableProxyFactory(contractTemplate);
    const proxy = new TransparentUpgradeableProxyFactory(proxyAddress);

    return nextImpl => proxy.upgradeTo(nextImpl);
  } else {
    // Admin contract: redirect upgrade call through it
    const manifest = await Manifest.forNetwork(provider);
    const AdminFactory = getProxyAdminFactory(contractTemplate);
    const admin = new AdminFactory(adminAddress);
    const manifestAdmin = await manifest.getAdmin();

    if (admin.address !== manifestAdmin?.address) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    }

    return nextImpl => admin.upgrade(proxyAddress, nextImpl);
  }
}
