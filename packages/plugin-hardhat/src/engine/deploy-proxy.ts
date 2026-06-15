import {
  Manifest,
  logWarning,
  ProxyDeployment,
  BeaconProxyUnsupportedError,
  InitialOwnerUnsupportedKindError,
  UpgradesError,
  inferProxyAdmin,
} from '@openzeppelin/upgrades-core';

import type { ContractInfo, DeployedContract, EngineBinding } from './binding.js';
import { deployProxyImpl } from './deploy-impl.js';
import { getInitializerData } from './initializer-data.js';
import { getInitialOwner } from './initial-owner.js';
import { getProxyContractInfo, getTransparentUpgradeableProxyContractInfo } from './artifacts.js';
import type { DeployProxyOptions } from './options.js';

export interface ProxyDeploymentResult extends DeployedContract {
  kind: ProxyDeployment['kind'];
}

/**
 * Client-neutral orchestration of `deployProxy`: deploys (or reuses) the implementation, encodes
 * the initializer, deploys the proxy from the vendored artifacts via the binding, and records the
 * proxy in the manifest. Returns the proxy deployment record for the binding to turn into a
 * contract instance.
 */
export async function deployProxy(
  binding: EngineBinding,
  implInfo: ContractInfo,
  args: readonly unknown[],
  opts: DeployProxyOptions,
): Promise<ProxyDeploymentResult> {
  const provider = binding.provider;
  const manifest = await Manifest.forNetwork(provider);

  const { impl, kind } = await deployProxyImpl(binding, implInfo, opts, undefined);

  const data = getInitializerData(binding, implInfo.abi, args, opts.initializer);

  if (await manifest.getAdmin()) {
    if (kind === 'uups') {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not natively used with the current kind of proxy ('uups').`,
        `Changes to the admin will have no effect on this new proxy.`,
      ]);
    } else if (kind === 'transparent') {
      logWarning(`A proxy admin was previously deployed on this network`, [
        `This is not used with new transparent proxy deployments, since new transparent proxies deploy their own admins.`,
        `Changes to the previous admin will have no effect on this new proxy.`,
      ]);
    }
  }

  let proxyDeployment: ProxyDeploymentResult;
  switch (kind) {
    case 'beacon': {
      throw new BeaconProxyUnsupportedError();
    }

    case 'uups': {
      if (opts.initialOwner !== undefined) {
        throw new InitialOwnerUnsupportedKindError(kind);
      }
      proxyDeployment = Object.assign({ kind }, await binding.deployProxy(getProxyContractInfo(), [impl, data]));
      break;
    }

    case 'transparent': {
      const initialOwner = await getInitialOwner(binding, opts);

      if (!opts.unsafeSkipProxyAdminCheck && (await inferProxyAdmin(provider, initialOwner))) {
        throw new UpgradesError(
          '`initialOwner` must not be a ProxyAdmin contract.',
          () =>
            `If the contract at address ${initialOwner} is not a ProxyAdmin contract and you are sure that this contract is able to call functions on an actual ProxyAdmin, skip this check with the \`unsafeSkipProxyAdminCheck\` option.`,
        );
      }

      proxyDeployment = Object.assign(
        { kind },
        await binding.deployProxy(getTransparentUpgradeableProxyContractInfo(), [impl, initialOwner, data]),
      );
      break;
    }
  }

  await manifest.addProxy(proxyDeployment);

  return proxyDeployment;
}
