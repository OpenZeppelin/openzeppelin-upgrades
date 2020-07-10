import type { SourceUnit } from 'solidity-ast';

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: {
        evm: {
          bytecode: {
            object: string;
          };
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
