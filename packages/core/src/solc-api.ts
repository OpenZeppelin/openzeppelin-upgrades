import type { SourceUnit } from 'solidity-ast';
import { StorageItem, TypeItem } from './storage';

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: {
        evm: {
          bytecode: SolcBytecode;
          methodIdentifiers?: Record<string, string>;
        };
        storageLayout?: {
          storage: StorageItem[];
          types: Record<string, TypeItem>;
        };
      };
    };
  };
  sources: {
    [file in string]: {
      ast: SourceUnit;
      id: number;
    };
  };
}

export interface SolcInput {
  sources: {
    [source in string]: {
      content?: string;
    };
  };
}

export type SolcLinkReferences = {
  [file in string]: {
    [library in string]: {
      length: number;
      start: number;
    }[];
  };
};

export interface SolcBytecode {
  linkReferences: SolcLinkReferences;
  object: string;
}
