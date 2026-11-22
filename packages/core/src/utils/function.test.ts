import test from 'ava';
import { artifacts } from 'hardhat';
import { FunctionDefinition } from 'solidity-ast';
import { findAll, astDereferencer, ASTDereferencer } from 'solidity-ast/utils';

import { getAbiFunctionSignature, getFunctionSignature } from './function';
import { validate } from '../validate';
import { solcInputOutputDecoder } from '../src-decoder';
import { SolcOutput } from '../solc-api';

testContract('ContractFunctionSignatures');
testContract('LibraryFunctionSignatures');

function testContract(contractName: string) {
  test(contractName, async t => {
    const fileName = 'contracts/test/FunctionSignatures.sol';
    const buildInfo = await artifacts.getBuildInfo(`${fileName}:${contractName}`);
    if (buildInfo === undefined) {
      throw new Error('Build info not found');
    }

    const solcOutput: SolcOutput = buildInfo.output;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const signatures = Object.keys(solcOutput.contracts[fileName][contractName].evm.methodIdentifiers!);

    const functions: Record<string, FunctionDefinition> = {};
    for (const def of findAll('FunctionDefinition', solcOutput.sources[fileName].ast)) {
      functions[def.name] = def;
    }
    const deref = astDereferencer(solcOutput);

    for (const signature of signatures) {
      const name = signature.replace(/\(.*/, '');
      t.is(getFunctionSignature(functions[name], deref), signature);
      if (contractName === 'ContractFunctionSignatures') {
        t.is(getAbiFunctionSignature(functions[name], deref), signature);
      }
    }
  });
}

test('validate succeeds with library functions that have storage parameters', async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/FunctionSignatures.sol:LibraryFunctionSignatures');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
  const run = validate(buildInfo.output, decodeSrc);
  t.is(run['contracts/test/FunctionSignatures.sol:LibraryFunctionSignatures'].abiMethods, undefined);
  t.truthy(run['contracts/test/FunctionSignatures.sol:ContractFunctionSignatures'].abiMethods);
});

test('getAbiFunctionSignature - enum with 256 members', t => {
  const fnDef = {
    name: 'f',
    parameters: { parameters: [{ typeName: { nodeType: 'UserDefinedTypeName', referencedDeclaration: 1 } }] },
  } as unknown as FunctionDefinition;
  const deref = (() => ({
    nodeType: 'EnumDefinition',
    members: new Array(256).fill({}),
  })) as unknown as ASTDereferencer;

  t.is(getAbiFunctionSignature(fnDef, deref), 'f(uint8)');
});
