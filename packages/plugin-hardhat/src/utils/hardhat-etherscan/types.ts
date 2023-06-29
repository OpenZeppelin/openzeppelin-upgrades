export interface CustomChain {
  network: string;
  chainId: number;
  urls: EtherscanURLs;
}

export interface EtherscanURLs {
  apiURL: string;
  browserURL: string;
}

export interface EtherscanConfig {
  apiKey?: string | Record<string, string>;
  customChains: CustomChain[];
}

export interface EtherscanNetworkEntry {
  network: string;
  urls: EtherscanURLs;
}
