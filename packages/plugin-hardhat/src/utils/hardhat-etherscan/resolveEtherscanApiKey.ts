import { UpgradesError } from '@openzeppelin/upgrades-core';

export const resolveEtherscanApiKey = (
  apiKey: string | Record<string, string> | undefined,
  network: string,
): string => {
  if (apiKey === undefined || apiKey === '') {
    throwMissingApiKeyError(network);
  }

  if (typeof apiKey === 'string') {
    return apiKey;
  }

  const key = (apiKey as any)[network];

  if (key === undefined || key === '') {
    throwMissingApiKeyError(network);
  }

  return key;
};

function throwMissingApiKeyError(network: string): never {
  throw new UpgradesError(
    `You are trying to verify a contract in '${network}', but no API token was found for this network. Please provide one in your hardhat config. For example:

{
  ...
  etherscan: {
    apiKey: {
      ${network}: 'your API key'
    }
  }
}

See https://etherscan.io/apis`,
  );
}
