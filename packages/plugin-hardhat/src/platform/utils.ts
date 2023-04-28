import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getChainId, hasCode, RemoteDeployment, DeployOpts, isDeploymentCompleted } from '@openzeppelin/upgrades-core';

import { Network, fromChainId } from 'defender-base-client';
import { AdminClient } from 'defender-admin-client';
import {
  BlockExplorerApiKeyClient,
  DeploymentClient,
  DeploymentConfigClient,
  PlatformClient,
} from 'platform-deploy-client';

import { HardhatPlatformConfig } from '../type-extensions';
import { Platform } from '../utils';
import debug from '../utils/debug';

import { promisify } from 'util';
const sleep = promisify(setTimeout);

export function getPlatformApiKey(hre: HardhatRuntimeEnvironment): HardhatPlatformConfig {
  const cfg = hre.config.platform;
  if (!cfg || !cfg.apiKey || !cfg.apiSecret) {
    const sampleConfig = JSON.stringify({ apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' }, null, 2);
    throw new Error(
      `Missing OpenZeppelin Platform API key and secret in hardhat config. Add the following to your hardhat.config.js configuration:\nplatform: ${sampleConfig}\n`,
    );
  }
  return cfg;
}

export function getAdminClient(hre: HardhatRuntimeEnvironment): AdminClient {
  return new AdminClient(getPlatformApiKey(hre));
}

export async function getNetwork(hre: HardhatRuntimeEnvironment): Promise<Network> {
  const { provider } = hre.network;
  const chainId = hre.network.config.chainId ?? (await getChainId(provider));
  const network = fromChainId(chainId);
  if (network === undefined) {
    throw new Error(`Network ${chainId} is not supported by the OpenZeppelin Platform`);
  }
  return network;
}

export function enablePlatform<T extends Platform>(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
  opts: T,
): T {
  if ((hre.config.platform?.useDeploy || platformModule) && opts.platform === undefined) {
    return {
      ...opts,
      platform: true,
    };
  } else {
    return opts;
  }
}

export function disablePlatform<T extends Platform>(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
  opts: T,
  unsupportedFunction: string,
): T {
  if (hre.config.platform?.useDeploy || platformModule || opts.platform) {
    debug(`The function ${unsupportedFunction} is not supported with \`platform\`. Using Hardhat signer instead.`);
    return {
      ...opts,
      platform: false,
    };
  } else {
    return opts;
  }
}

interface PlatformClient {
  Deployment: DeploymentClient;
  DeploymentConfig: DeploymentConfigClient;
  BlockExplorerApiKey: BlockExplorerApiKeyClient;
}

export function getPlatformClient(hre: HardhatRuntimeEnvironment): PlatformClient {
  return PlatformClient(getPlatformApiKey(hre));
}

/**
 * Gets the remote deployment response for the given id.
 *
 * @param hre The Hardhat runtime environment
 * @param remoteDeploymentId The deployment id.
 * @returns The deployment response, or undefined if the deployment is not found.
 * @throws Error if the deployment response could not be retrieved.
 */
export async function getRemoteDeployment(
  hre: HardhatRuntimeEnvironment,
  remoteDeploymentId: string,
): Promise<RemoteDeployment | undefined> {
  const client = getPlatformClient(hre);
  try {
    return (await client.Deployment.get(remoteDeploymentId)) as RemoteDeployment;
  } catch (e) {
    const message = (e as any).response?.data?.message;
    if (message?.match(/deployment with id .* not found\./)) {
      return undefined;
    }
    throw e;
  }
}

/**
 * Waits indefinitely for the deployment until it is completed or failed.
 */
export async function waitForDeployment(
  hre: HardhatRuntimeEnvironment,
  opts: DeployOpts,
  address: string,
  remoteDeploymentId: string,
) {
  const pollInterval = opts.pollingInterval ?? 5e3;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await hasCode(hre.ethers.provider, address)) {
      debug('code in target address found', address);
      break;
    }

    const completed = await isDeploymentCompleted(address, remoteDeploymentId, id => getRemoteDeployment(hre, id));
    if (completed) {
      break;
    } else {
      await sleep(pollInterval);
    }
  }
}
