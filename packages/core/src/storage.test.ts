import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { SolcOutput } from './solc-api';
import { extractStorageLayout, getStorageUpgradeErrors } from './storage';

interface Context {
  contracts: Record<string, ContractDefinition>;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcOutput: SolcOutput = JSON.parse(
    await fs.readFile('cache/solc-output.json', 'utf8'),
  );
  t.context.contracts = {};
  for (const def of findAll(
    'ContractDefinition',
    solcOutput.sources['contracts/test/Storage.sol'].ast,
  )) {
    t.context.contracts[def.name] = def;
  }
});

const dummyDecodeSrc = () => 'file.sol:1';

test('Storage1', t => {
  const contract = 'Storage1';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def, dummyDecodeSrc);
  t.snapshot(layout);
});

test('Storage2', t => {
  const contract = 'Storage2';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def, dummyDecodeSrc);
  t.snapshot(layout);
});

test('storage upgrade equal', t => {
  const v1 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Equal_V1'],
    dummyDecodeSrc,
  );
  const v2 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Equal_V2'],
    dummyDecodeSrc,
  );
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade append', t => {
  const v1 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Append_V1'],
    dummyDecodeSrc,
  );
  const v2 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Append_V2'],
    dummyDecodeSrc,
  );
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade delete', t => {
  const v1 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Delete_V1'],
    dummyDecodeSrc,
  );
  const v2 = extractStorageLayout(
    t.context.contracts['StorageUpgrade_Delete_V2'],
    dummyDecodeSrc,
  );
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, [
    {
      action: 'delete',
      original: {
        contract: 'StorageUpgrade_Delete_V1',
        label: 'x1',
        type: 't_uint256',
        src: 'file.sol:1',
      },
    },
  ]);
});
