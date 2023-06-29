import { Dispatcher } from 'undici';

import { sendGetRequest, sendPostRequest } from './undici';

import { EtherscanCheckStatusRequest, EtherscanVerifyRequest } from './EtherscanVerifyContractRequest';

import { UpgradesError } from '@openzeppelin/upgrades-core';

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Used for polling the result of the contract verification.
const verificationIntervalMs = 3000;

export async function verifyContract(url: string, req: EtherscanVerifyRequest): Promise<EtherscanResponse> {
  const parameters = new URLSearchParams({ ...req });

  let response: Dispatcher.ResponseData;
  try {
    response = await sendPostRequest(new URL(url), parameters.toString());
  } catch (error: any) {
    throw new UpgradesError(
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${error.message}`,
    );
  }

  if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
    // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
    const responseText = await response.body.text();
    throw new UpgradesError(
      `Failed to send contract verification request.
Endpoint URL: ${url}
The HTTP server response is not ok. Status code: ${response.statusCode} Response text: ${responseText}`,
    );
  }

  const etherscanResponse = new EtherscanResponse(await response.body.json());

  if (etherscanResponse.isBytecodeMissingInNetworkError()) {
    throw new UpgradesError(
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: The Etherscan API responded that the address ${req.contractaddress} does not have bytecode.
This can happen if the contract was recently deployed and this fact hasn't propagated to the backend yet.
Try waiting for a minute before verifying your contract. If you are invoking this from a script,
try to wait for five confirmations of your contract deployment transaction before running the verification subtask.`,
    );
  }

  if (!etherscanResponse.isOk()) {
    throw new UpgradesError(etherscanResponse.message);
  }

  return etherscanResponse;
}

export async function getVerificationStatus(url: string, req: EtherscanCheckStatusRequest): Promise<EtherscanResponse> {
  const parameters = new URLSearchParams({ ...req });
  const urlWithQuery = new URL(url);
  urlWithQuery.search = parameters.toString();

  let response;
  try {
    response = await sendGetRequest(urlWithQuery);

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();
      const message = `The HTTP server response is not ok. Status code: ${response.statusCode} Response text: ${responseText}`;

      throw new UpgradesError(message);
    }
  } catch (error: any) {
    throw new UpgradesError(
      `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${urlWithQuery.toString()}
Reason: ${error.message}`,
    );
  }

  const etherscanResponse = new EtherscanResponse(await response.body.json());

  if (etherscanResponse.isPending()) {
    await delay(verificationIntervalMs);

    return getVerificationStatus(url, req);
  }

  if (etherscanResponse.isVerificationFailure()) {
    return etherscanResponse;
  }

  if (!etherscanResponse.isOk()) {
    throw new UpgradesError(
      `The Etherscan API responded with a failure status.
The verification may still succeed but should be checked manually.
Reason: ${etherscanResponse.message}`,
    );
  }

  return etherscanResponse;
}

export class EtherscanResponse {
  public readonly status: number;

  public readonly message: string;

  constructor(response: any) {
    this.status = parseInt(response.status, 10);
    this.message = response.result;
  }

  public isPending() {
    return this.message === 'Pending in queue';
  }

  public isVerificationFailure() {
    return this.message === 'Fail - Unable to verify';
  }

  public isVerificationSuccess() {
    return this.message === 'Pass - Verified';
  }

  public isBytecodeMissingInNetworkError() {
    return this.message.startsWith('Unable to locate ContractCode at');
  }

  public isOk() {
    return this.status === 1;
  }
}

export async function isAlreadyVerified(apiURL: string, apiKey: string, address: string): Promise<boolean> {
  const parameters = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    address,
    apikey: apiKey,
  });

  const url = new URL(apiURL);
  url.search = parameters.toString();

  const response = await sendGetRequest(url);
  const json = await response.body.json();

  if (json.message !== 'OK') {
    return false;
  }

  const sourceCode = json?.result?.[0]?.SourceCode;
  return sourceCode !== undefined && sourceCode !== '';
}
