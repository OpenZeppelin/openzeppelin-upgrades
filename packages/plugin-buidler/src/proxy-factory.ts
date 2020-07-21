import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import { Signer, ContractFactory } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json';

export async function getProxyFactory(bre: BuidlerRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return bre.ethers.getContractFactory(AdminUpgradeabilityProxy.abi, AdminUpgradeabilityProxy.bytecode, signer);
}

export async function getProxyAdminFactory(bre: BuidlerRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return bre.ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, signer);
}
