import { ContractFactory, ContractRunner } from 'ethers';
import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import ITransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

export async function getProxyFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode, runner);
}

export async function getTransparentUpgradeableProxyFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(TransparentUpgradeableProxy.abi, TransparentUpgradeableProxy.bytecode, runner);
}

export async function getITransparentUpgradeableProxyFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(ITransparentUpgradeableProxy.abi, ITransparentUpgradeableProxy.bytecode, runner);
}

export async function getProxyAdminFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode, runner);
}

export async function getBeaconProxyFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(BeaconProxy.abi, BeaconProxy.bytecode, runner);
}

export async function getUpgradeableBeaconFactory(runner?: null | ContractRunner): Promise<ContractFactory> {
  return new ContractFactory(UpgradeableBeacon.abi, UpgradeableBeacon.bytecode, runner);
}
