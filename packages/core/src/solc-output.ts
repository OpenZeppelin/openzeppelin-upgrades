import type { SourceUnit } from 'solidity-ast';

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: {
        evm: {
          deployedBytecode: {
            object: string;
          };
        };
      };
    };
  };
  sources: {
    [file in string]: {
      ast: SourceUnit;
    };
  };
}
