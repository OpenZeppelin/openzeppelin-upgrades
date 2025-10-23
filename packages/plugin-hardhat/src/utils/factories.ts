import { ContractFactory, Signer } from 'ethers';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json' with { type: 'json' };
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json' with { type: 'json' };
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json' with { type: 'json' };
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json' with { type: 'json' };

import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

export async function getProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  const { ethers } = await hre.network.connect();
  return ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode, signer);
}

export async function getTransparentUpgradeableProxyFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  const { ethers } = await hre.network.connect();
  return ethers.getContractFactory(TransparentUpgradeableProxy.abi, TransparentUpgradeableProxy.bytecode, signer);
}

export async function getBeaconProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  const { ethers } = await hre.network.connect();
  return ethers.getContractFactory(BeaconProxy.abi, BeaconProxy.bytecode, signer);
}

export async function getUpgradeableBeaconFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  const { ethers } = await hre.network.connect();
  return ethers.getContractFactory(UpgradeableBeacon.abi, UpgradeableBeacon.bytecode, signer);
}
