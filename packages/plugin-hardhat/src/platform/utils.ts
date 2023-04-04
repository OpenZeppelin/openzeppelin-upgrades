import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getChainId,
  hasCode,
  DeploymentResponse,
  DeployOpts,
  isDeploymentCompleted,
} from '@openzeppelin/upgrades-core';

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

export function setPlatformDefaults(hre: HardhatRuntimeEnvironment, platformModule: boolean, opts: Platform) {
  if ((hre.config.platform?.deploy || platformModule) && opts.platform === undefined) {
    opts.platform = true;
  }
}

export function disablePlatform(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
  opts: Platform = {},
  unsupportedFunction: string,
) {
  if (hre.config.platform?.deploy || platformModule || opts.platform) {
    debug(`The function ${unsupportedFunction} is not supported with \`platform\`. Using Hardhat signer instead.`);
    opts.platform = false;
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

export async function getDeploymentResponse(
  hre: HardhatRuntimeEnvironment,
  deploymentId: string,
  catchIfNotfound: boolean,
): Promise<DeploymentResponse | undefined> {
  const client = getPlatformClient(hre);
  try {
    return await client.Deployment.get(deploymentId);
  } catch (e) {
    const message = (e as any).response?.data?.message;
    if (catchIfNotfound && message !== undefined && message.match(/deployment with id .* not found\./)) {
      return undefined;
    }
    throw e;
  }
}

/**
 * Wait indefinitely for the deployment until it is completed or failed.
 */
export async function waitForDeployment(
  hre: HardhatRuntimeEnvironment,
  opts: DeployOpts,
  address: string,
  deploymentId: string,
) {
  const pollInterval = opts.pollingInterval ?? 5e3;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await hasCode(hre.ethers.provider, address)) {
      debug('code in target address found', address);
      break;
    }

    const completed = await isDeploymentCompleted(address, deploymentId, catchIfNotFound =>
      getDeploymentResponse(hre, deploymentId, catchIfNotFound),
    );
    if (completed) {
      break;
    } else {
      await sleep(pollInterval);
    }
  }
}
