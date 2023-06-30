import { toCheckStatusRequest, toVerifyRequest } from './hardhat-etherscan/EtherscanVerifyContractRequest';
import { getVerificationStatus, verifyContract } from './hardhat-etherscan/EtherscanService';
import { resolveEtherscanApiKey } from './hardhat-etherscan/resolveEtherscanApiKey';

import { UpgradesError } from '@openzeppelin/upgrades-core';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { request } from 'undici';

import debug from './debug';
import { getCurrentChainConfig } from '@nomicfoundation/hardhat-verify/dist/src/chain-config';

/**
 * Call the configured Etherscan API with the given parameters.
 *
 * @param etherscanApi The Etherscan API config
 * @param params The API parameters to call with
 * @returns The Etherscan API response
 */
export async function callEtherscanApi(etherscanApi: EtherscanAPIConfig, params: any): Promise<EtherscanResponseBody> {
  const parameters = new URLSearchParams({ ...params, apikey: etherscanApi.key });

  const response = await request(etherscanApi.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parameters.toString(),
  });

  if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
    const responseBodyText = await response.body.text();
    throw new UpgradesError(
      `Etherscan API call failed with status ${response.statusCode}, response: ${responseBodyText}`,
    );
  }

  const responseBodyJson = await response.body.json();
  debug('Etherscan response', JSON.stringify(responseBodyJson));

  return responseBodyJson;
}

/**
 * Gets the Etherscan API parameters from Hardhat config.
 * Throws an error if Etherscan API key is not present in config.
 */
export async function getEtherscanAPIConfig(hre: HardhatRuntimeEnvironment): Promise<EtherscanAPIConfig> {
  const etherscanConfig: EtherscanConfig | undefined = (hre.config as any).etherscan; // This should never be undefined, but check just in case
  const endpoints = await getCurrentChainConfig(hre.network, etherscanConfig ? etherscanConfig.customChains : []);
  const key = resolveEtherscanApiKey(etherscanConfig?.apiKey, endpoints.network);
  return { key, url: endpoints.urls.apiURL };
}

/**
 * Etherscan configuration for hardhat-verify.
 */
interface EtherscanConfig {
  apiKey: string | Record<string, string>;
  customChains: any[];
}

/**
 * Parameters for calling the Etherscan API at a specific URL.
 */
export interface EtherscanAPIConfig {
  key: string;
  url: string;
}

/**
 * The response body from an Etherscan API call.
 */
interface EtherscanResponseBody {
  status: string;
  message: string;
  result: any;
}

export const RESPONSE_OK = '1';

export async function verifyAndGetStatus(
  params: {
    apiKey: string;
    contractAddress: any;
    sourceCode: string;
    sourceName: string;
    contractName: string;
    compilerVersion: string;
    constructorArguments: string;
  },
  etherscanApi: EtherscanAPIConfig,
) {
  const request = toVerifyRequest(params);
  const response = await verifyContract(etherscanApi.url, request);
  const statusRequest = toCheckStatusRequest({
    apiKey: etherscanApi.key,
    guid: response.message,
  });
  const status = await getVerificationStatus(etherscanApi.url, statusRequest);
  return status;
}
