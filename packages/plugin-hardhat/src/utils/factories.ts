import { ContractFactory, Signer } from 'ethers';

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getContracts } from './get-contracts';

export async function getProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  const contracts = getContracts(hre);
  return hre.ethers.getContractFactory(contracts.erc1967.abi, contracts.erc1967.bytecode, signer);
}

export async function getTransparentUpgradeableProxyFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  const contracts = getContracts(hre);
  return hre.ethers.getContractFactory(
    contracts.transparentUpgradeableProxy.abi,
    contracts.transparentUpgradeableProxy.bytecode,
    signer,
  );
}

export async function getBeaconProxyFactory(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  const contracts = getContracts(hre);
  return hre.ethers.getContractFactory(contracts.beaconProxy.abi, contracts.beaconProxy.bytecode, signer);
}

export async function getUpgradeableBeaconFactory(
  hre: HardhatRuntimeEnvironment,
  signer?: Signer,
): Promise<ContractFactory> {
  const contracts = getContracts(hre);
  return hre.ethers.getContractFactory(contracts.upgradeableBeacon.abi, contracts.upgradeableBeacon.bytecode, signer);
}
