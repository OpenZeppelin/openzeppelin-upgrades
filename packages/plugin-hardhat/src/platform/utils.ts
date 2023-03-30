import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getChainId,
  hasCode,
  InvalidDeployment,
  UpgradesError,
  DeploymentResponse,
  DeployOpts,
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

class PlatformUnsupportedError extends UpgradesError {
  constructor(functionName: string, details?: string) {
    super(
      `The function ${functionName} is not supported with \`platform\``,
      () => details ?? `Call the upgrades.${functionName} function without the \`platform\` option.`,
    );
  }
}

export function setPlatformDefaults(hre: HardhatRuntimeEnvironment, platformModule: boolean, opts: Platform) {
  if ((hre.config.platform?.deploy || platformModule) && opts.platform === undefined) {
    opts.platform = true;
  }
}

export function assertNotPlatform(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
  opts: Platform = {},
  unsupportedFunction: string,
  details?: string,
) {
  setPlatformDefaults(hre, platformModule, opts);
  if (opts?.platform) {
    throw new PlatformUnsupportedError(unsupportedFunction, details);
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

export async function waitForDeployment(
  hre: HardhatRuntimeEnvironment,
  opts: DeployOpts,
  address: string,
  deploymentId: string,
) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await hasCode(hre.ethers.provider, address)) {
      debug('code in target address found', address);
      break;
    }

    const pollingInterval = opts.pollingInterval ?? 5e3;

    debug('verifying deployment id', deploymentId);
    const response = await getDeploymentResponse(hre, deploymentId, false);
    if (response === undefined) {
      throw new Error(`Broken invariant: Response not found for deployment id ${deploymentId}`);
    }

    const status = response.status;
    if (status === 'completed') {
      debug('succeeded verifying deployment id completed', deploymentId);
      break;
    } else if (status === 'failed') {
      debug('deployment id failed', deploymentId);
      throw new InvalidDeployment({ address, txHash: response.txHash });
    } else if (status === 'submitted') {
      debug('waiting for deployment id to be completed', deploymentId);
      await sleep(pollingInterval);
    } else {
      throw new Error(`Broken invariant: Unrecognized status ${status} for deployment id ${deploymentId}`);
    }
  }
}
