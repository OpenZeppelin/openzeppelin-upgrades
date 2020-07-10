import { ethers } from '@nomiclabs/buidler';
import { Signer } from 'ethers';
import AdminUpgradeabilityProxy from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

export async function getProxyFactory(signer?: Signer) {
  return ethers.getContractFactory(
    AdminUpgradeabilityProxy.abi,
    AdminUpgradeabilityProxy.bytecode,
    signer,
  );
}
