import { ContractFactory, Signer } from 'ethers';
import type { NetworkConnection } from 'hardhat/types/network';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');
const BeaconProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json');
const UpgradeableBeacon = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');
const TransparentUpgradeableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

// These ethers proxy/beacon factory builders are retained for the ethers binding (to attach to a
// deployed beacon) and for tests that construct proxy factories directly. The engine itself
// deploys proxies and beacons from the vendored artifacts via `src/engine/artifacts.ts`.

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
