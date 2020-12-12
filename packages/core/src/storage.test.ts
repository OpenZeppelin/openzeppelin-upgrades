import _test, { TestInterface } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from './solc-api';
import { astDereferencer, ASTDereferencer } from './ast-dereferencer';
import { extractStorageLayout, getStorageUpgradeErrors, stabilizeTypeIdentifier, StorageLayout } from './storage';

interface Context {
  contracts: Record<string, ContractDefinition>;
  deref: ASTDereferencer;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/Storage.sol:Storage1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  t.context.contracts = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/Storage.sol'].ast)) {
    t.context.contracts[def.name] = def;
  }
  t.context.deref = astDereferencer(solcOutput);
});

const dummyDecodeSrc = () => 'file.sol:1';

test('Storage1', t => {
  const contract = 'Storage1';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def, dummyDecodeSrc, t.context.deref);
  t.snapshot(stabilizeStorageLayout(layout));
});

test('Storage2', t => {
  const contract = 'Storage2';
  const def = t.context.contracts[contract];
  const layout = extractStorageLayout(def, dummyDecodeSrc, t.context.deref);
  t.snapshot(stabilizeStorageLayout(layout));
});

test('storage upgrade equal', t => {
  const v1 = extractStorageLayout(t.context.contracts['StorageUpgrade_Equal_V1'], dummyDecodeSrc, t.context.deref);
  const v2 = extractStorageLayout(t.context.contracts['StorageUpgrade_Equal_V2'], dummyDecodeSrc, t.context.deref);
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade append', t => {
  const v1 = extractStorageLayout(t.context.contracts['StorageUpgrade_Append_V1'], dummyDecodeSrc, t.context.deref);
  const v2 = extractStorageLayout(t.context.contracts['StorageUpgrade_Append_V2'], dummyDecodeSrc, t.context.deref);
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade delete', t => {
  const v1 = extractStorageLayout(t.context.contracts['StorageUpgrade_Delete_V1'], dummyDecodeSrc, t.context.deref);
  const v2 = extractStorageLayout(t.context.contracts['StorageUpgrade_Delete_V2'], dummyDecodeSrc, t.context.deref);
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, [
    {
      kind: 'delete',
      original: {
        contract: 'StorageUpgrade_Delete_V1',
        label: 'x1',
        type: 't_uint256',
        src: 'file.sol:1',
      },
    },
  ]);
});

function stabilizeStorageLayout(layout: StorageLayout) {
  return {
    storage: layout.storage.map(s => ({ ...s, type: stabilizeTypeIdentifier(s.type) })),
    types: Object.entries(layout.types).map(([type, item]) => [stabilizeTypeIdentifier(type), item]),
  };
}
