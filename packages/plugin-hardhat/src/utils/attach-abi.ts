import { Contract, Signer } from 'ethers';
import type { NetworkConnection } from 'hardhat/types/network';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ITransparentUpgradeableProxyV5 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json');
const ITransparentUpgradeableProxyV4 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json');
const ProxyAdminV5 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const ProxyAdminV4 = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');

export async function attachITransparentUpgradeableProxyV5(
  connection: NetworkConnection,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  const { ethers } = connection;
  return ethers.getContractAt(ITransparentUpgradeableProxyV5.abi, address, signer);
}

export async function attachITransparentUpgradeableProxyV4(
  connection: NetworkConnection,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  const { ethers } = connection;
  return ethers.getContractAt(ITransparentUpgradeableProxyV4.abi, address, signer);
}

export async function attachProxyAdminV5(
  connection: NetworkConnection,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  const { ethers } = connection;
  return ethers.getContractAt(ProxyAdminV5.abi, address, signer);
}

export async function attachProxyAdminV4(
  connection: NetworkConnection,
  address: string,
  signer?: Signer,
): Promise<Contract> {
  const { ethers } = connection;
  return ethers.getContractAt(ProxyAdminV4.abi, address, signer);
}
