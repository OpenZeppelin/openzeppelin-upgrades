import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractFactory, Contract } from 'ethers';

import { Manifest, logWarning, ProxyDeployment } from '@openzeppelin/upgrades-core';

import {
  DeployOptions,
  deploy,
  DeployTransaction,
  getBeaconProxyFactory,
  ContractAddressOrInstance,
  getContractAddress,
  ContractFactoryOrSigner,
  getSigner,
} from './utils';
import { getInitializerData } from './deploy-proxy';
import { getImplementationAddressFromBeacon, getInterfaceFromManifest } from './utils/impl-address';

export interface DeployBeaconProxyFunction {
  (
    beacon: ContractAddressOrInstance,
    ImplFactoryOrSigner: ContractFactoryOrSigner,
    args?: unknown[],
    opts?: DeployOptions,
  ): Promise<Contract>;
  (
    beacon: ContractAddressOrInstance,
    ImplFactoryOrSigner: ContractFactoryOrSigner,
    opts?: DeployOptions,
  ): Promise<Contract>;
}

export function makeDeployBeaconProxy(hre: HardhatRuntimeEnvironment): DeployBeaconProxyFunction {
  return async function deployBeaconProxy(
    beacon: ContractAddressOrInstance,
    ImplFactoryOrSigner: ContractFactoryOrSigner,
    args: unknown[] | DeployOptions = [],
    opts: DeployOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    opts.kind = 'beacon';

    const beaconAddress = getContractAddress(beacon);
    const implAddress = await getImplementationAddressFromBeacon(hre, getSigner(ImplFactoryOrSigner), beaconAddress);
    let contractInterface = await getInterfaceFromManifest(hre, implAddress);

    if (contractInterface === undefined) {
      if (ImplFactoryOrSigner instanceof ContractFactory) {
        contractInterface = ImplFactoryOrSigner.interface;
      } else {
        throw new Error(
          `Beacon's current implementation at address ${implAddress} was not found in the network manifest. Call deployBeaconProxy() with a contract factory for the beacon's current implementation.`,
        );
      }
    }

    const data = getInitializerData(contractInterface, args, opts.initializer);

    if (await manifest.getAdmin()) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('beacon').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    }

    const BeaconProxyFactory = await getBeaconProxyFactory(hre, getSigner(ImplFactoryOrSigner));
    const proxyDeployment: Required<ProxyDeployment & DeployTransaction> = Object.assign(
      { kind: opts.kind },
      await deploy(BeaconProxyFactory, beaconAddress, data),
    );

    await manifest.addProxy(proxyDeployment);

    let inst: Contract;
    if (ImplFactoryOrSigner instanceof ContractFactory) {
      inst = ImplFactoryOrSigner.attach(proxyDeployment.address);
    } else {
      inst = new Contract(proxyDeployment.address, contractInterface, ImplFactoryOrSigner);
    }
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxyDeployment.deployTransaction;
    return inst;
  };
}
