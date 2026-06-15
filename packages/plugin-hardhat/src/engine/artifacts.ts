import { createRequire } from 'node:module';
import type { Abi, ContractInfo } from './binding.js';

/**
 * Client-neutral access to the proxy and proxy-admin artifacts vendored in
 * `@openzeppelin/upgrades-core`. Returns plain `{ abi, bytecode }` and ABIs, leaving the
 * construction of client objects (ethers `ContractFactory`, viem encoders) to the bindings.
 */

const require = createRequire(import.meta.url);

const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');
const BeaconProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json');
const UpgradeableBeacon = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');
const TransparentUpgradeableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

const ITransparentUpgradeableProxyV5 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json');
const ITransparentUpgradeableProxyV4 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json');
const ProxyAdminV5 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const ProxyAdminV4 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');

export function getProxyContractInfo(): ContractInfo {
  return { abi: ERC1967Proxy.abi, bytecode: ERC1967Proxy.bytecode };
}

export function getTransparentUpgradeableProxyContractInfo(): ContractInfo {
  return { abi: TransparentUpgradeableProxy.abi, bytecode: TransparentUpgradeableProxy.bytecode };
}

export function getBeaconProxyContractInfo(): ContractInfo {
  return { abi: BeaconProxy.abi, bytecode: BeaconProxy.bytecode };
}

export function getUpgradeableBeaconContractInfo(): ContractInfo {
  return { abi: UpgradeableBeacon.abi, bytecode: UpgradeableBeacon.bytecode };
}

// ABIs of the interfaces used to encode upgrade and admin calls.
export const iTransparentUpgradeableProxyV5Abi: Abi = ITransparentUpgradeableProxyV5.abi;
export const iTransparentUpgradeableProxyV4Abi: Abi = ITransparentUpgradeableProxyV4.abi;
export const proxyAdminV5Abi: Abi = ProxyAdminV5.abi;
export const proxyAdminV4Abi: Abi = ProxyAdminV4.abi;
export const upgradeableBeaconAbi: Abi = UpgradeableBeacon.abi;
