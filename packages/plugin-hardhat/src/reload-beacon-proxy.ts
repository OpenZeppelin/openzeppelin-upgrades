import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract, ethers } from 'ethers';

import { Manifest, getBeaconAddress } from '@openzeppelin/upgrades-core';

import { Interface } from '@ethersproject/abi';

export interface ReloadBeaconProxyFunction {
  (proxy: Contract): Promise<Contract>;
}

export function makeReloadBeaconProxy(hre: HardhatRuntimeEnvironment): ReloadBeaconProxyFunction {
  return async function reloadBeaconProxy(
    proxy: Contract
  ) {
    const { provider } = hre.network;

    const beaconAddress = await getBeaconAddress(provider, proxy.address);
    let contractInterface: Interface;
    try {
      contractInterface = await getBeaconInterfaceFromManifest(hre, beaconAddress);
      return new Contract(proxy.address, contractInterface, proxy.signer);
    } catch (e: any) {
        throw new Error(`Beacon at address ${beaconAddress} was not found in the network manifest. Use the implementation's contract factory to attach to the proxy address instead.`);
      }
    }
}

async function getBeaconInterfaceFromManifest(hre: HardhatRuntimeEnvironment, beaconAddress: string) {
  const { provider } = hre.network;
  const manifest = await Manifest.forNetwork(provider);
  const beaconDeployment = await manifest.getBeaconFromAddress(beaconAddress);
  return new ethers.utils.Interface(beaconDeployment.abi);
}
