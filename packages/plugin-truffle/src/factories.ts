import AdminUpgradeabilityProxyArtifact from '@openzeppelin/upgrades-core/artifacts/contracts/proxy/AdminUpgradeabilityProxy.sol/AdminUpgradeabilityProxy.json';
import ProxyAdminArtifact from '@openzeppelin/upgrades-core/artifacts/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json';

import { TruffleContract, ContractClass, getTruffleDefaults, getTruffleProvider } from './truffle';

export function getProxyFactory(template: ContractClass): ContractClass {
  const AdminUpgradeabilityProxy = TruffleContract(AdminUpgradeabilityProxyArtifact);
  AdminUpgradeabilityProxy.setProvider(template.currentProvider);
  AdminUpgradeabilityProxy.defaults(template.class_defaults);
  return AdminUpgradeabilityProxy;
}

export function getProxyAdminFactory(template?: ContractClass): ContractClass {
  const ProxyAdmin = TruffleContract(ProxyAdminArtifact);
  const defaults = template?.class_defaults ?? getTruffleDefaults();
  const provider = template?.currentProvider ?? getTruffleProvider();

  ProxyAdmin.setProvider(provider);
  ProxyAdmin.defaults(defaults);
  return ProxyAdmin;
}
