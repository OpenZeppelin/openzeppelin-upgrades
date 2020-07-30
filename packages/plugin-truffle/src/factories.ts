import AdminUpgradeabilityProxyArtifact from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';
import ProxyAdminArtifact from '@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json';

import { TruffleContract, ContractClass } from './truffle';

export function getProxyFactory(template: ContractClass): ContractClass {
  const AdminUpgradeabilityProxy = TruffleContract(AdminUpgradeabilityProxyArtifact);
  AdminUpgradeabilityProxy.setProvider(template.currentProvider);
  AdminUpgradeabilityProxy.defaults(template.class_defaults);
  return AdminUpgradeabilityProxy;
}

export function getProxyAdminFactory(template: ContractClass): ContractClass {
  const ProxyAdmin = TruffleContract(ProxyAdminArtifact);
  ProxyAdmin.setProvider(template.currentProvider);
  ProxyAdmin.defaults(template.class_defaults);
  return ProxyAdmin;
}
