import { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import { Signer, ContractFactory } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

export async function getProxyFactory(bre: BuidlerRuntimeEnvironment, signer?: Signer): Promise<ContractFactory> {
  return bre.ethers.getContractFactory(AdminUpgradeabilityProxy.abi, AdminUpgradeabilityProxy.bytecode, signer);
}
