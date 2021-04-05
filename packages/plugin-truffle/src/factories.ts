import TransparentUpgradeableProxyArtifact from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdminArtifact from '@openzeppelin/upgrades-core/artifacts//@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

import { TruffleContract, ContractClass, getTruffleDefaults, getTruffleProvider } from './truffle';

export function getProxyFactory(template: ContractClass): ContractClass {
  const TransparentUpgradeableProxy = TruffleContract(TransparentUpgradeableProxyArtifact);
  TransparentUpgradeableProxy.setProvider(template.currentProvider);
  TransparentUpgradeableProxy.defaults(template.class_defaults);
  return TransparentUpgradeableProxy;
}

export function getProxyAdminFactory(template?: ContractClass): ContractClass {
  const ProxyAdmin = TruffleContract(ProxyAdminArtifact);
  const defaults = template?.class_defaults ?? getTruffleDefaults();
  const provider = template?.currentProvider ?? getTruffleProvider();

  ProxyAdmin.setProvider(provider);
  ProxyAdmin.defaults(defaults);
  return ProxyAdmin;
}
