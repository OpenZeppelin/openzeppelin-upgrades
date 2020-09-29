import { SourceUnit } from 'solidity-ast';

export interface Deployer {
  provider: TruffleProvider;
  deploy(contract: ContractClass, ...args: unknown[]): Promise<ContractInstance>;
}

export interface ContractClass {
  new (address: string): ContractInstance;
  'new'(...args: unknown[]): ContractInstance;
  deployed(): Promise<ContractInstance>;
  setProvider(provider: TruffleProvider): void;
  defaults(defaults: ContractClassDefaults): void;
  bytecode: string;
  currentProvider: TruffleProvider;
  class_defaults: ContractClassDefaults;
  contractName: string;
  address?: string;
  networks?: {
    [id: string]: NetworkObject;
  };
}

export interface NetworkObject {
  address?: string;
  transactionHash?: string;
  links: {
    [libName: string]: string;
  };
}

export interface ContractClassDefaults {
  from: string;
  gas: number;
  gasPrice: number;
}

export interface ContractInstance {
  address: string;
  transactionHash?: string;
  contract: {
    methods: {
      [name: string]: (
        ...args: unknown[]
      ) => {
        encodeABI(): string;
      };
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [other: string]: any;
}

export interface TruffleArtifact {
  contractName: string;
  sourcePath: string;
  source: string;
  bytecode: string;
  ast: SourceUnit;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TruffleProviderResult = { result: any; error: { message: string } };

export interface TruffleProvider {
  send(
    args: { method: string; params: unknown[]; id: string },
    callback: (err: unknown, value: TruffleProviderResult) => void,
  ): void;
}

export interface TruffleConfig {
  provider: TruffleProvider;
  contracts_build_directory: string;
  contracts_directory: string;
  from: string;
  gas: number;
  gasPrice: number;
}

declare const config: undefined | TruffleConfig;

export function getTruffleConfig(): TruffleConfig {
  if (typeof config === 'undefined') {
    throw new Error('Global Truffle config not found: Truffle >=5.1.35 is required. Truffle exec not yet supported');
  } else {
    return config;
  }
}

export function getTruffleDefaults(): ContractClassDefaults {
  const { from, gas, gasPrice } = getTruffleConfig();
  return { from, gas, gasPrice };
}

export function getTruffleProvider(): TruffleProvider {
  return getTruffleConfig().provider;
}

// The argument can't be of type TruffleArtifact because we use this with
// artifacts generated by Buidler, which are only partially compatible.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const TruffleContract = require('@truffle/contract') as (artifact: unknown) => ContractClass;
