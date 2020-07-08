import { ethers } from '@nomiclabs/buidler';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

export async function getProxyFactory() {
  return ethers.getContractFactory(
    AdminUpgradeabilityProxy.abi,
    AdminUpgradeabilityProxy.bytecode,
  );
}
