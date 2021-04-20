import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Signer, ContractFactory } from 'ethers';
import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

export async function getProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode, signer);
}

export async function getTransparentUpgradeableProxyFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(TransparentUpgradeableProxy.abi, TransparentUpgradeableProxy.bytecode, signer);
}

export async function getProxyAdminFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, signer);
}
