import { ContractFactory, Signer } from 'ethers';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';

import { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function getProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode, signer);
}

export async function getTransparentUpgradeableProxyFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(TransparentUpgradeableProxy.abi, TransparentUpgradeableProxy.bytecode, signer);
}

export async function getBeaconProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(BeaconProxy.abi, BeaconProxy.bytecode, signer);
}

export async function getUpgradeableBeaconFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  return hre.ethers.getContractFactory(UpgradeableBeacon.abi, UpgradeableBeacon.bytecode, signer);
}
