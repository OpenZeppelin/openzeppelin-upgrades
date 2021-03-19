import { TruffleContract, ContractClass, getTruffleDefaults, getTruffleProvider } from './truffle';

import ERC1967ProxyArtifact from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import TransparentUpgradeableProxyArtifact from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdminArtifact from '@openzeppelin/upgrades-core/artifacts//@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

function makeFactoryGetter(artifacts: unknown): (template?: ContractClass) => ContractClass {
  return function (template?: ContractClass): ContractClass {
    const contract = TruffleContract(artifacts);
    contract.setProvider(template?.currentProvider ?? getTruffleProvider());
    contract.defaults(template?.class_defaults ?? getTruffleDefaults());
    return contract;
  };
}

export const getProxyFactory = makeFactoryGetter(ERC1967ProxyArtifact);
export const getTransparentUpgradeableProxyFactory = makeFactoryGetter(TransparentUpgradeableProxyArtifact);
export const getProxyAdminFactory = makeFactoryGetter(ProxyAdminArtifact);
