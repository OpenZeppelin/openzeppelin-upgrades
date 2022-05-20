import { resolveEtherscanApiKey } from '@nomiclabs/hardhat-etherscan/dist/src/resolveEtherscanApiKey';

import { UpgradesError } from '@openzeppelin/upgrades-core';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { EtherscanConfig } from '@nomiclabs/hardhat-etherscan/dist/src/types';

import { Dispatcher } from 'undici';

import debug from './debug';

/**
 * Call the configured Etherscan API with the given parameters.
 *
 * @param etherscanApi The Etherscan API config
 * @param params The API parameters to call with
 * @returns The Etherscan API response
 */
export async function callEtherscanApi(etherscanApi: EtherscanAPIConfig, params: any): Promise<EtherscanResponseBody> {
  const { request } = await import('undici');

  const parameters = new URLSearchParams({ ...params, apikey: etherscanApi.key });
  const method: Dispatcher.HttpMethod = 'POST';
  const requestDetails = {
    method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parameters.toString(),
  };

  const response = await request(etherscanApi.endpoints.urls.apiURL, requestDetails);

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
 * Makes use of Hardhat Etherscan for handling cases when Etherscan API parameters are not present in config.
 */
export async function getEtherscanAPIConfig(hre: HardhatRuntimeEnvironment): Promise<EtherscanAPIConfig> {
  const endpoints = await hre.run('verify:get-etherscan-endpoint');
  const etherscanConfig: EtherscanConfig = (hre.config as any).etherscan;
  const key = resolveEtherscanApiKey(etherscanConfig, endpoints.network);
  return { key, endpoints };
}

/**
 * The Etherscan API parameters from the Hardhat config.
 */
export interface EtherscanAPIConfig {
  key: string;
  endpoints: any;
}

/**
 * The response body from an Etherscan API call.
 */
interface EtherscanResponseBody {
  status: string;
  message: string;
  result: any;
}
