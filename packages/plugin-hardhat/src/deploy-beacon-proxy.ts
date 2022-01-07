import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract } from 'ethers';
import { Interface } from 'ethers/lib/utils';

import {
  Manifest,
  logWarning,
  ProxyDeployment,
  UpgradesError,
  getImplementationAddressFromBeacon,
  isBeacon,
  DeployBeaconProxyUnsupportedError,
  DeployBeaconProxyImplUnknownError,
  DeployBeaconProxyKindError,
} from '@openzeppelin/upgrades-core';

import {
  DeployProxyOptions,
  deploy,
  DeployTransaction,
  getBeaconProxyFactory,
  ContractAddressOrInstance,
  getContractAddress,
  getInitializerData,
  getInterfaceFromManifest,
  DeployBeaconProxyOptions,
} from './utils';

export interface DeployBeaconProxyFunction {
  (beacon: ContractAddressOrInstance, args?: unknown[], opts?: DeployBeaconProxyOptions): Promise<Contract>;
  (beacon: ContractAddressOrInstance, opts?: DeployBeaconProxyOptions): Promise<Contract>;
}

export function makeDeployBeaconProxy(hre: HardhatRuntimeEnvironment): DeployBeaconProxyFunction {
  return async function deployBeaconProxy(
    beacon: ContractAddressOrInstance,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployBeaconProxyOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    if (opts.kind !== undefined && opts.kind !== 'beacon') {
      throw new DeployBeaconProxyKindError(opts.kind);
    }
    opts.kind = 'beacon';

    const beaconAddress = getContractAddress(beacon);
    if (!(await isBeacon(provider, beaconAddress))) {
      throw new DeployBeaconProxyUnsupportedError(beaconAddress);
    }

    let contractInterface: Interface | undefined;
    if (opts.implementation !== undefined) {
      contractInterface = opts.implementation.interface;
    } else {
      const implAddress = await getImplementationAddressFromBeacon(provider, beaconAddress);
      contractInterface = await getInterfaceFromManifest(hre, implAddress);
      if (contractInterface === undefined) {
        throw new DeployBeaconProxyImplUnknownError(implAddress);
      }
    }

    const data = getInitializerData(contractInterface, args, opts.initializer);

    if (await manifest.getAdmin()) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('beacon').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    }

    let signer;
    if (opts.signer !== undefined) {
      signer = opts.signer;
    } else if (opts.implementation !== undefined) {
      signer = opts.implementation.signer;
    } else {
      const signers = await hre.ethers.getSigners();
      if (signers.length > 0) {
        signer = signers[0];
      } else {
        throw new UpgradesError(
          `No signer was found.`,
          () => `Call deployBeaconProxy() with the signer or implementation option.`,
        );
      }
    }

    const BeaconProxyFactory = await getBeaconProxyFactory(hre, signer);
    const proxyDeployment: Required<ProxyDeployment & DeployTransaction> = Object.assign(
      { kind: opts.kind },
      await deploy(BeaconProxyFactory, beaconAddress, data),
    );

    await manifest.addProxy(proxyDeployment);

    let inst: Contract;
    if (opts.implementation !== undefined) {
      inst = opts.implementation.attach(proxyDeployment.address);
    } else {
      inst = new Contract(proxyDeployment.address, contractInterface, signer);
    }
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxyDeployment.deployTransaction;
    return inst;
  };
}
