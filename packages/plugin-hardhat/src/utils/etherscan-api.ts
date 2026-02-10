import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import { UpgradesError } from '@openzeppelin/upgrades-core';
import debug from './debug.js';

/**
 * Etherscan-like instance from hardhat-verify v3 (hre.network.connect().verification.etherscan).
 * Uses customApiCall for API requests; verify/getVerificationStatus for contract verification.
 */
export interface EtherscanInstance {
  chainId: number;
  name: string;
  url: string;
  apiUrl: string;
  apiKey: string;
  customApiCall(params: Record<string, string | number | undefined>): Promise<EtherscanResponseBody>;
  verify(
    contractAddress: string,
    sourceCode: string,
    contractName: string,
    compilerVersion: string,
    constructorArguments: string,
  ): Promise<{ message: string }>;
  getVerificationStatus(message: string): Promise<{ success: boolean; message: string }>;
}

/**
 * The response body from an Etherscan API call.
 */
export interface EtherscanResponseBody {
  status: string;
  message: string;
  result: unknown;
}

export const RESPONSE_OK = '1';

/**
 * Gets the Etherscan instance from the network connection (hardhat-verify v3.0.10+).
 * Requires @nomicfoundation/hardhat-verify to be loaded and the network to expose verification.etherscan.
 */
export async function getEtherscanFromConnection(hre: HardhatRuntimeEnvironment): Promise<EtherscanInstance> {
  const connection = await hre.network.connect();
  const verification = (connection as { verification?: { etherscan?: EtherscanInstance } }).verification;
  if (!verification?.etherscan) {
    throw new UpgradesError(
      'Etherscan verification is not available for this network.',
      () =>
        'Ensure @nomicfoundation/hardhat-verify v3.0.10+ is installed and that the network supports Etherscan (e.g. etherscan config in hardhat.config).',
    );
  }
  return verification.etherscan;
}

/**
 * Call the Etherscan API via hardhat-verify's customApiCall (adds apikey and chainid as needed).
 */
export async function callEtherscanApi(
  etherscan: EtherscanInstance,
  params: Record<string, string | number | undefined>,
): Promise<EtherscanResponseBody> {
  try {
    const response = await etherscan.customApiCall(params);
    debug('Etherscan response', JSON.stringify(response));
    return response as EtherscanResponseBody;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new UpgradesError(`Etherscan API call failed: ${message}`);
  }
}

/**
 * Submit contract for verification and poll for status using the Etherscan instance.
 */
export async function verifyAndGetStatus(
  params: {
    contractAddress: string;
    sourceCode: string;
    contractName: string;
    compilerVersion: string;
    constructorArguments: string;
  },
  etherscan: EtherscanInstance,
): Promise<{ success: boolean; message: string }> {
  const response = await etherscan.verify(
    params.contractAddress,
    params.sourceCode,
    params.contractName,
    params.compilerVersion,
    params.constructorArguments,
  );
  return etherscan.getVerificationStatus(response.message);
}
