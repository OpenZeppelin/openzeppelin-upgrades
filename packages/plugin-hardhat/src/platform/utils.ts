import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getChainId,
  hasCode,
  RemoteDeployment,
  DeployOpts,
  isDeploymentCompleted,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import { Network, fromChainId } from 'defender-base-client';
import {
  BlockExplorerApiKeyClient,
  DeploymentClient,
  DeploymentConfigClient,
  PlatformClient,
  UpgradeClient,
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
  if ((hre.config.platform?.usePlatformDeploy || platformModule) && opts.usePlatformDeploy === undefined) {
    return {
      ...opts,
      usePlatformDeploy: true,
    };
  } else {
    return opts;
  }
}

/**
 * Disables Platform for a function that does not support it.
 * If opts.usePlatformDeploy or platformModule is true, throws an error.
 * If hre.config.platform.usePlatformDeploy is true, logs a debug message and passes (to allow fallback to Hardhat signer).
 *
 * @param hre The Hardhat runtime environment
 * @param platformModule Whether the function was called from the platform module
 * @param opts The options passed to the function
 * @param unsupportedFunction The name of the function that does not support Platform
 */
export function disablePlatform(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
  opts: Platform,
  unsupportedFunction: string,
): void {
  if (opts.usePlatformDeploy) {
    throw new UpgradesError(
      `The function ${unsupportedFunction} is not supported with the \`usePlatformDeploy\` option.`,
    );
  } else if (platformModule) {
    throw new UpgradesError(
      `The function ${unsupportedFunction} is not supported with the \`platform\` module.`,
      () => `Call the function as upgrades.${unsupportedFunction} to use the Hardhat signer.`,
    );
  } else if (hre.config.platform?.usePlatformDeploy) {
    debug(
      `The function ${unsupportedFunction} is not supported with the \`platform.usePlatformDeploy\` configuration option. Using the Hardhat signer instead.`,
    );
  }
}

interface PlatformClient {
  Deployment: DeploymentClient;
  DeploymentConfig: DeploymentConfigClient;
  BlockExplorerApiKey: BlockExplorerApiKeyClient;
  Upgrade: UpgradeClient;
}

export function getPlatformClient(hre: HardhatRuntimeEnvironment): PlatformClient {
  return PlatformClient(getPlatformApiKey(hre));
}

/**
 * Gets the remote deployment response for the given id.
 *
 * @param hre The Hardhat runtime environment
 * @param remoteDeploymentId The deployment id.
 * @returns The remote deployment response, or undefined if the deployment is not found.
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
 * Returns the last known transaction hash seen from the remote deployment, or undefined if the remote deployment was not retrieved.
 */
export async function waitForDeployment(
  hre: HardhatRuntimeEnvironment,
  opts: DeployOpts,
  address: string,
  remoteDeploymentId: string,
): Promise<string | undefined> {
  const pollInterval = opts.pollingInterval ?? 5e3;
  let lastKnownTxHash: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await hasCode(hre.ethers.provider, address)) {
      debug('code in target address found', address);
      break;
    }

    const response = await getRemoteDeployment(hre, remoteDeploymentId);
    lastKnownTxHash = response?.txHash;
    const completed = await isDeploymentCompleted(address, remoteDeploymentId, response);
    if (completed) {
      break;
    } else {
      await sleep(pollInterval);
    }
  }
  return lastKnownTxHash;
}
