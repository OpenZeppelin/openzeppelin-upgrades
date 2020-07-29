import type { SourceUnit } from 'solidity-ast';

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: {
        evm: {
          bytecode: SolcBytecode;
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

export interface SolcBytecode {
  linkReferences: {
    [file in string]: {
      [library in string]: unknown;
    };
  };
  object: string;
}
