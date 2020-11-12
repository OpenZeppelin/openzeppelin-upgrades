import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Signer, ContractFactory } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/contracts/proxy/AdminUpgradeabilityProxy.sol/AdminUpgradeabilityProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json';

export async function getProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(AdminUpgradeabilityProxy.abi, AdminUpgradeabilityProxy.bytecode, signer);
}

export async function getProxyAdminFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, signer);
}
