import { ethers } from '@nomiclabs/buidler';
import { Signer, ContractFactory } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json';

export async function getProxyFactory(signer?: Signer): Promise<ContractFactory> {
  return ethers.getContractFactory(AdminUpgradeabilityProxy.abi, AdminUpgradeabilityProxy.bytecode, signer);
}

export async function getProxyAdminFactory(signer?: Signer): Promise<ContractFactory> {
  return ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, signer);
}
