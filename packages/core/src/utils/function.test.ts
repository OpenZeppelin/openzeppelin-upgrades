import _test, { TestInterface } from 'ava';
import { artifacts } from 'hardhat';
import { FunctionDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getFunctionSignature } from './function';
import { SolcOutput } from '../solc-api';
import { astDereferencer, ASTDereferencer } from '../ast-dereferencer';

interface Context {
  signatures: string[];
  functions: Record<string, FunctionDefinition>;
  deref: ASTDereferencer;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const fileName = 'contracts/test/FunctionSignatures.sol';
  const contractName = 'FunctionSignatures';
  const buildInfo = await artifacts.getBuildInfo(`${fileName}:${contractName}`);
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }

  const solcOutput: SolcOutput = buildInfo.output;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  t.context.signatures = Object.keys(solcOutput.contracts[fileName][contractName].evm.methodIdentifiers!);

  t.context.functions = {};
  for (const def of findAll('FunctionDefinition', solcOutput.sources[fileName].ast)) {
    t.context.functions[def.name] = def;
  }
  t.context.deref = astDereferencer(solcOutput);
});

test('signatures', t => {
  for (const signature of t.context.signatures) {
    const name = signature.replace(/\(.*/, '');
    t.is(getFunctionSignature(t.context.functions[name], t.context.deref), signature);
  }
});
