import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { SolcOutput } from './solc-output';
import { extractStorageLayout } from './storage';

interface Context {
  contracts: Record<string, ContractDefinition>;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcOutput: SolcOutput = JSON.parse(await fs.readFile('cache/solc-output.json', 'utf8'));
  t.context.contracts = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/Storage.sol'].ast)) {
    t.context.contracts[def.name] = def;
  }
});

test('Storage1', t => {
  const contract = 'Storage1';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def);
  t.snapshot(layout);
});

test('Storage2', t => {
  const contract = 'Storage2';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def);
  t.snapshot(layout);
});
