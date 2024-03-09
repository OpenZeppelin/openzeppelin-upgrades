import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getChainId,
  hasCode,
  RemoteDeployment,
  DeployOpts,
  isDeploymentCompleted,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import { Network, fromChainId } from '@openzeppelin/defender-sdk-base-client';
import { TxOverrides } from '@openzeppelin/defender-sdk-deploy-client';

import { HardhatDefenderConfig } from '../type-extensions';
import { DefenderDeploy } from '../utils';
import debug from '../utils/debug';
import { Overrides } from 'ethers';

import { promisify } from 'util';
import { getDeployClient, getNetworkClient } from './client';
const sleep = promisify(setTimeout);

export function getDefenderApiKey(hre: HardhatRuntimeEnvironment): HardhatDefenderConfig {
  const cfg = hre.config.defender;
  if (!cfg || !cfg.apiKey || !cfg.apiSecret) {
    const sampleConfig = JSON.stringify({ apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' }, null, 2);
    throw new Error(
      `Missing OpenZeppelin Defender API key and secret in hardhat config. Add the following to your hardhat.config.js configuration:\ndefender: ${sampleConfig}\n`,
    );
  }
  return cfg;
}

export async function getNetwork(hre: HardhatRuntimeEnvironment): Promise<Network> {
  const { provider } = hre.network;
  const chainId = hre.network.config.chainId ?? (await getChainId(provider));

  const networkNames = await getNetworkNames(chainId, hre);

  const userConfigNetwork = hre.config.defender?.network;
  if (networkNames.length === 0) {
    throw new UpgradesError(
      `The current network with chainId ${chainId} is not supported by OpenZeppelin Defender`,
      () => `If this is a private or forked network, add it in Defender from the Manage tab.`,
    );
  } else if (networkNames.length === 1) {
    const network = networkNames[0];
    if (userConfigNetwork !== undefined && network !== userConfigNetwork) {
      throw new UpgradesError(
        `Detected network ${network} does not match specified network: ${userConfigNetwork}`,
        () =>
          `The current chainId ${chainId} is detected as ${network} on OpenZeppelin Defender, but the hardhat config's 'defender' section specifies network: ${userConfigNetwork}.\nEnsure you are connected to the correct network.`,
      );
    }
    return network;
  } else {
    if (userConfigNetwork === undefined) {
      throw new UpgradesError(
        `Detected multiple networks with the same chainId ${chainId} on OpenZeppelin Defender: ${Array.from(networkNames).join(', ')}`,
        () =>
          `Specify the network that you want to use in your hardhat config file as follows:\ndefender: { network: 'networkName' }`,
      );
    } else if (!networkNames.includes(userConfigNetwork)) {
      throw new UpgradesError(
        `Specified network ${userConfigNetwork} does not match any of the detected networks for chainId ${chainId}: ${Array.from(networkNames).join(', ')}`,
        () =>
          `Ensure you are connected to the correct network, or specify one of the detected networks in your hardhat config file.`,
      );
    }
    return userConfigNetwork;
  }
}

async function getNetworkNames(chainId: number, hre: HardhatRuntimeEnvironment) {
  const matchingNetworks = [];

  const knownNetwork = fromChainId(chainId);
  if (knownNetwork !== undefined) {
    matchingNetworks.push(knownNetwork);
  }

  const networkClient = getNetworkClient(hre);

  const forkedNetworks = await networkClient.listForkedNetworks();
  for (const network of forkedNetworks) {
    if (network.chainId === chainId) {
      matchingNetworks.push(network.name);
    }
  }

  const privateNetworks = await networkClient.listPrivateNetworks();
  for (const network of privateNetworks) {
    if (network.chainId === chainId) {
      matchingNetworks.push(network.name);
    }
  }

  return matchingNetworks;
}

export function enableDefender<T extends DefenderDeploy>(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  opts: T,
): T {
  if ((hre.config.defender?.useDefenderDeploy || defenderModule) && opts.useDefenderDeploy === undefined) {
    return {
      ...opts,
      useDefenderDeploy: true,
    };
  } else {
    return opts;
  }
}

/**
 * Disables Defender for a function that does not support it.
 * If opts.useDefenderDeploy or defenderModule is true, throws an error.
 * If hre.config.defender.useDefenderDeploy is true, logs a debug message and passes (to allow fallback to Hardhat signer).
 *
 * @param hre The Hardhat runtime environment
 * @param defenderModule Whether the function was called from the defender module
 * @param opts The options passed to the function
 * @param unsupportedFunction The name of the function that does not support Defender
 */
export function disableDefender(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  opts: DefenderDeploy,
  unsupportedFunction: string,
): void {
  if (opts.useDefenderDeploy) {
    throw new UpgradesError(
      `The function ${unsupportedFunction} is not supported with the \`useDefenderDeploy\` option.`,
    );
  } else if (defenderModule) {
    throw new UpgradesError(
      `The function ${unsupportedFunction} is not supported with the \`defender\` module.`,
      () => `Call the function as upgrades.${unsupportedFunction} to use the Hardhat signer.`,
    );
  } else if (hre.config.defender?.useDefenderDeploy) {
    debug(
      `The function ${unsupportedFunction} is not supported with the \`defender.useDefenderDeploy\` configuration option. Using the Hardhat signer instead.`,
    );
  }
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
  const client = getDeployClient(hre);
  try {
    return (await client.getDeployedContract(remoteDeploymentId)) as RemoteDeployment;
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

export function parseTxOverrides(overrides?: Overrides): TxOverrides | undefined {
  if (!overrides) {
    return undefined;
  }
  if (
    typeof overrides.gasLimit === 'bigint' ||
    typeof overrides.gasPrice === 'bigint' ||
    typeof overrides.maxFeePerGas === 'bigint' ||
    typeof overrides.maxPriorityFeePerGas === 'bigint'
  ) {
    throw new Error('bigint not yet supported');
  }
  return {
    gasLimit: parseNumberOrUndefined(overrides.gasLimit),
    gasPrice: parseHexOrUndefined(overrides.gasPrice),
    maxFeePerGas: parseHexOrUndefined(overrides.maxFeePerGas),
    maxPriorityFeePerGas: parseHexOrUndefined(overrides.maxPriorityFeePerGas),
  };
}

function parseHexOrUndefined(value?: string | number | null): string | undefined {
  if (typeof value === 'string' && !!value) {
    return value;
  }
  if (typeof value === 'number') {
    return `0x${value.toString(16)}`;
  }
  return undefined;
}

function parseNumberOrUndefined(value?: string | number | null): number | undefined {
  if (typeof value === 'string' && !!value) {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
}
