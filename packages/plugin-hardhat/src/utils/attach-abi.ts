import { Contract, Signer } from 'ethers';
import type { NetworkConnection } from 'hardhat/types/network';

import ITransparentUpgradeableProxyV5 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json' with { type: 'json' };
import ITransparentUpgradeableProxyV4 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json' with { type: 'json' };

import ProxyAdminV5 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json' with { type: 'json' };
import ProxyAdminV4 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json' with { type: 'json' };

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
