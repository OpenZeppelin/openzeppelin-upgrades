import {
  Manifest,
  logWarning,
  isBeacon,
  DeployBeaconProxyUnsupportedError,
  DeployBeaconProxyKindError,
} from '@openzeppelin/upgrades-core';

import type { Abi, EngineBinding } from './binding.js';
import { getInitializerData } from './initializer-data.js';
import { getBeaconProxyContractInfo } from './artifacts.js';
import type { ProxyDeploymentResult } from './deploy-proxy.js';
import type { DeployBeaconProxyOptions } from './options.js';

/**
 * Client-neutral orchestration of `deployBeaconProxy`. `attachToAbi` is the ABI of the beacon's
 * current implementation, used only to encode the initializer call.
 */
export async function deployBeaconProxy(
  binding: EngineBinding,
  beaconAddress: string,
  attachToAbi: Abi,
  args: readonly unknown[],
  opts: DeployBeaconProxyOptions,
): Promise<ProxyDeploymentResult> {
  const provider = binding.provider;
  const manifest = await Manifest.forNetwork(provider);

  if (opts.kind !== undefined && opts.kind !== 'beacon') {
    throw new DeployBeaconProxyKindError(opts.kind);
  }
  opts.kind = 'beacon';

  if (!(await isBeacon(provider, beaconAddress))) {
    throw new DeployBeaconProxyUnsupportedError(beaconAddress);
  }

  const data = getInitializerData(binding, attachToAbi, args, opts.initializer);

  if (await manifest.getAdmin()) {
    logWarning(`A proxy admin was previously deployed on this network`, [
      `This is not natively used with the current kind of proxy ('beacon').`,
      `Changes to the admin will have no effect on this new proxy.`,
    ]);
  }

  const proxyDeployment: ProxyDeploymentResult = Object.assign(
    { kind: opts.kind },
    await binding.deployProxy(getBeaconProxyContractInfo(), [beaconAddress, data]),
  );

  await manifest.addProxy(proxyDeployment);

  return proxyDeployment;
}
