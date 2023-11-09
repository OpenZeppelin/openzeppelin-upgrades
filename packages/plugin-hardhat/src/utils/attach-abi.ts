import { Contract, Signer } from 'ethers';

import ITransparentUpgradeableProxyV5 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json';
import ITransparentUpgradeableProxyV4 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json';

import ProxyAdminV5 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';
import ProxyAdminV4 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

import { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function attachITransparentUpgradeableProxyV5(
  hre: HardhatRuntimeEnvironment,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  return hre.ethers.getContractAt(ITransparentUpgradeableProxyV5.abi, address, signer);
}

export async function attachITransparentUpgradeableProxyV4(
  hre: HardhatRuntimeEnvironment,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  return hre.ethers.getContractAt(ITransparentUpgradeableProxyV4.abi, address, signer);
}

export async function attachProxyAdminV5(
  hre: HardhatRuntimeEnvironment,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  return hre.ethers.getContractAt(ProxyAdminV5.abi, address, signer);
}

export async function attachProxyAdminV4(
  hre: HardhatRuntimeEnvironment,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  return hre.ethers.getContractAt(ProxyAdminV4.abi, address, signer);
}
