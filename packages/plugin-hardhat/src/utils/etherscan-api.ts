import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type {
  Etherscan,
  EtherscanCustomApiCallOptions,
  EtherscanVerifyArgs,
  EtherscanResponseBody,
} from '@nomicfoundation/hardhat-verify/types';
import { UpgradesError } from '@openzeppelin/upgrades-core';
import debug from './debug.js';

export type { Etherscan, EtherscanCustomApiCallOptions, EtherscanVerifyArgs, EtherscanResponseBody };

export const RESPONSE_OK = '1';

/**
 * Gets the Etherscan instance from the network connection (hardhat-verify v3.0.10+).
 * Requires @nomicfoundation/hardhat-verify to be loaded and the network to expose verification.etherscan.
 */
export async function getEtherscanFromConnection(hre: HardhatRuntimeEnvironment): Promise<Etherscan> {
  const connection = await hre.network.connect();
  const verification = (connection as unknown as { verification?: { etherscan?: Etherscan } }).verification;
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
  etherscan: Etherscan,
  params: Record<string, string | number | undefined>,
  options?: EtherscanCustomApiCallOptions,
): Promise<EtherscanResponseBody> {
  try {
    const response = await etherscan.customApiCall(params, options);
    debug('Etherscan response', JSON.stringify(response));
    return response;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new UpgradesError(`Etherscan API call failed: ${message}`);
  }
}

/**
 * Submit contract for verification and poll for status using the Etherscan instance.
 */
export async function verifyAndGetStatus(
  params: EtherscanVerifyArgs,
  etherscan: Etherscan,
): Promise<{ success: boolean; message: string }> {
  const guid = await etherscan.verify(params);
  return etherscan.pollVerificationStatus(guid, params.contractAddress, params.contractName);
}
