import { ContractFactory, Signer } from 'ethers';
import type { NetworkConnection } from 'hardhat/types/network';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json' with { type: 'json' };
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json' with { type: 'json' };
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json' with { type: 'json' };
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json' with { type: 'json' };

export async function getProxyFactory(connection: NetworkConnection, signer?: Signer): Promise<ContractFactory> {
  const { ethers } = connection;
  return ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode, signer);
}

export async function getTransparentUpgradeableProxyFactory(
  connection: NetworkConnection,
  signer?: Signer,
): Promise<ContractFactory> {
  const { ethers } = connection;
  return ethers.getContractFactory(TransparentUpgradeableProxy.abi, TransparentUpgradeableProxy.bytecode, signer);
}

export async function getBeaconProxyFactory(connection: NetworkConnection, signer?: Signer): Promise<ContractFactory> {
  const { ethers } = connection;
  return ethers.getContractFactory(BeaconProxy.abi, BeaconProxy.bytecode, signer);
}

export async function getUpgradeableBeaconFactory(
  connection: NetworkConnection,
  signer?: Signer,
): Promise<ContractFactory> {
  const { ethers } = connection;
  return ethers.getContractFactory(UpgradeableBeacon.abi, UpgradeableBeacon.bytecode, signer);
}
