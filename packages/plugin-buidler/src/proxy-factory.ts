import { ethers } from '@nomiclabs/buidler';
import { Signer, ContractFactory } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

export async function getProxyFactory(signer?: Signer): Promise<ContractFactory> {
  return ethers.getContractFactory(AdminUpgradeabilityProxy.abi, AdminUpgradeabilityProxy.bytecode, signer);
}
