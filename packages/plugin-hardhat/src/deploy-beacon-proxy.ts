import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract, ContractFactory } from 'ethers';
import assert from 'assert';

import {
  Manifest,
  logWarning,
  ProxyDeployment,
  isBeacon,
  DeployBeaconProxyUnsupportedError,
  DeployBeaconProxyKindError,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import {
  DeployBeaconProxyOptions,
  deploy,
  DeployTransaction,
  getBeaconProxyFactory,
  ContractAddressOrInstance,
  getContractAddress,
  getInitializerData,
} from './utils';
import { setPlatformDefaults, waitForDeployment } from './platform/utils';

export interface DeployBeaconProxyFunction {
  (
    beacon: ContractAddressOrInstance,
    attachTo: ContractFactory,
    args?: unknown[],
    opts?: DeployBeaconProxyOptions,
  ): Promise<Contract>;
  (beacon: ContractAddressOrInstance, attachTo: ContractFactory, opts?: DeployBeaconProxyOptions): Promise<Contract>;
}

export function makeDeployBeaconProxy(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
): DeployBeaconProxyFunction {
  return async function deployBeaconProxy(
    beacon: ContractAddressOrInstance,
    attachTo: ContractFactory,
    args: unknown[] | DeployBeaconProxyOptions = [],
    opts: DeployBeaconProxyOptions = {},
  ) {
    if (!(attachTo instanceof ContractFactory)) {
      throw new UpgradesError(
        `attachTo must specify a contract factory`,
        () => `Include the contract factory for the beacon's current implementation in the attachTo parameter`,
      );
    }
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    setPlatformDefaults(platformModule, opts);

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

    const data = getInitializerData(attachTo.interface, args, opts.initializer);

    if (await manifest.getAdmin()) {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('beacon').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    }

    const BeaconProxyFactory = await getBeaconProxyFactory(hre, attachTo.signer);
    const proxyDeployment: ProxyDeployment & DeployTransaction = Object.assign(
      { kind: opts.kind },
      await deploy(hre, opts, BeaconProxyFactory, beaconAddress, data),
    );

    await manifest.addProxy(proxyDeployment);

    const inst = attachTo.attach(proxyDeployment.address);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxyDeployment.deployTransaction;
    if (opts.platform && proxyDeployment.deploymentId !== undefined) {
      inst.deployed = async () => {
        assert(proxyDeployment.deploymentId !== undefined);
        await waitForDeployment(hre, opts, inst.address, proxyDeployment.deploymentId);
        return inst;
      };
    }
    return inst;
  };
}
