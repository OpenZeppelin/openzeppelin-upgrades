import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract, ethers, Signer } from 'ethers';

import { Manifest, getBeaconAddress } from '@openzeppelin/upgrades-core';

import { Interface } from '@ethersproject/abi';
import { ContractAddressOrInstance, getContractAddress } from './utils';

export interface LoadProxyFunction {
  (proxy: Contract, signer?: Signer): Promise<Contract>;
  (proxy: ContractAddressOrInstance, signer: Signer): Promise<Contract>;
}

export function makeLoadProxy(hre: HardhatRuntimeEnvironment): LoadProxyFunction {
  return async function loadProxy(proxy: ContractAddressOrInstance | Contract, signer?: Signer) {
    const { provider } = hre.network;

    const proxyAddress = getContractAddress(proxy);
    const beaconAddress = await getBeaconAddress(provider, proxyAddress);
    let contractInterface: Interface;
    try {
      contractInterface = await getBeaconInterfaceFromManifest(hre, beaconAddress);
      if (signer === undefined && proxy instanceof Contract) {
        signer = proxy.signer;
      }
      return new Contract(proxyAddress, contractInterface, signer);
    } catch (e: any) {
      throw new Error(
        `Beacon at address ${beaconAddress} was not found in the network manifest. Use the implementation's contract factory to attach to the proxy address instead.`,
      );
    }
  };
}

async function getBeaconInterfaceFromManifest(hre: HardhatRuntimeEnvironment, beaconAddress: string) {
  const { provider } = hre.network;
  const manifest = await Manifest.forNetwork(provider);
  const beaconDeployment = await manifest.getBeaconFromAddress(beaconAddress);
  return new ethers.utils.Interface(beaconDeployment.abi);
}
