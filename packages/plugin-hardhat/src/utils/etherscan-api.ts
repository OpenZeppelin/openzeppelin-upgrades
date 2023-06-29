import { toCheckStatusRequest, toVerifyRequest } from './hardhat-etherscan/EtherscanVerifyContractRequest';
import { getVerificationStatus, verifyContract } from './hardhat-etherscan/EtherscanService';
import { resolveEtherscanApiKey } from './hardhat-etherscan/resolveEtherscanApiKey';

import { UpgradesError } from '@openzeppelin/upgrades-core';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { request } from 'undici';

import debug from './debug';
import { getCurrentChainConfig } from '@nomicfoundation/hardhat-verify/dist/src/chain-config';
import { ChainConfig, EtherscanConfig } from '@nomicfoundation/hardhat-verify/dist/src/types';

/**
 * Call the configured Etherscan API with the given parameters.
 *
 * @param etherscanApi The Etherscan API config
 * @param params The API parameters to call with
 * @returns The Etherscan API response
 */
export async function callEtherscanApi(etherscanApi: EtherscanAPIConfig, params: any): Promise<EtherscanResponseBody> {
  const parameters = new URLSearchParams({ ...params, apikey: etherscanApi.key });

  const response = await request(etherscanApi.endpoints.urls.apiURL, {
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
 * Makes use of Hardhat Etherscan for handling cases when Etherscan API parameters are not present in config.
 */
export async function getEtherscanAPIConfig(hre: HardhatRuntimeEnvironment): Promise<EtherscanAPIConfig> {
  const endpoints = await getCurrentChainConfig(hre.network, (hre.config as any).etherscan.customChains);
  const etherscanConfig: EtherscanConfig = (hre.config as any).etherscan;
  const key = resolveEtherscanApiKey(etherscanConfig.apiKey, endpoints.network);
  return { key, endpoints };
}

/**
 * The Etherscan API parameters from the Hardhat config.
 */
export interface EtherscanAPIConfig {
  key: string;
  endpoints: ChainConfig;
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
  const response = await verifyContract(etherscanApi.endpoints.urls.apiURL, request);
  const statusRequest = toCheckStatusRequest({
    apiKey: etherscanApi.key,
    guid: response.message,
  });
  const status = await getVerificationStatus(etherscanApi.endpoints.urls.apiURL, statusRequest);
  return status;
}
