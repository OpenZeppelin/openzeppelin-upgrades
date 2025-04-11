import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll, astDereferencer } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from '../solc-api';
import { getStorageUpgradeErrors } from '../storage';
import { StorageLayout } from './layout';
import { extractStorageLayout } from './extract';

interface Context {
  extractStorageLayout: (contract: string) => StorageLayout;
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/StructAppend.sol:StructAppendV1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  const contracts: Record<string, ContractDefinition> = {};
  const storageLayouts: Record<string, StorageLayout> = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/StructAppend.sol'].ast)) {
    contracts[def.name] = def;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    storageLayouts[def.name] = solcOutput.contracts['contracts/test/StructAppend.sol'][def.name].storageLayout!;
  }
  const deref = astDereferencer(solcOutput);
  const dummyDecodeSrc = () => 'file.sol:1';
  t.context.extractStorageLayout = name =>
    extractStorageLayout(contracts[name], dummyDecodeSrc, deref, storageLayouts[name]);
});

test('struct append at end of storage - ok', t => {
  const v1 = t.context.extractStorageLayout('StructAppendV1');
  const v2 = t.context.extractStorageLayout('StructAppendV2_Ok');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, [], JSON.stringify(comparison, null, 2));
});

test('struct append not at end of storage - bad', t => {
  const v1 = t.context.extractStorageLayout('StructAppendBeforeStorageEndV1');
  const v2 = t.context.extractStorageLayout('StructAppendBeforeStorageEndV2_Bad');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 2,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: { kind: 'append' },
        },
      },
      original: { label: 'myStruct' },
      updated: { label: 'myStruct' },
    },
    1: {
      kind: 'layoutchange',
      change: {
        slot: {
          from: '2',
          to: '3',
        },
      },
      original: { label: 'zz' },
      updated: { label: 'zz' },
    },
  });
});
