import _test, { TestInterface } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from './solc-api';
import { astDereferencer } from './ast-dereferencer';
import { extractStorageLayout, getStorageUpgradeErrors, stabilizeTypeIdentifier, StorageLayout } from './storage';

interface Context {
  extractStorageLayout: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/Storage.sol:Storage1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  const contracts: Record<string, ContractDefinition> = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/Storage.sol'].ast)) {
    contracts[def.name] = def;
  }
  const deref = astDereferencer(solcOutput);
  t.context.extractStorageLayout = name => extractStorageLayout(contracts[name], dummyDecodeSrc, deref);
});

const dummyDecodeSrc = () => 'file.sol:1';

test('Storage1', t => {
  const layout = t.context.extractStorageLayout('Storage1');
  t.snapshot(stabilizeStorageLayout(layout));
});

test('Storage2', t => {
  const layout = t.context.extractStorageLayout('Storage2');
  t.snapshot(stabilizeStorageLayout(layout));
});

test('storage upgrade equal', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Equal_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Equal_V2');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade append', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Append_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Append_V2');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('storage upgrade delete', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Delete_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Delete_V2');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 1,
    0: {
      kind: 'delete',
      original: {
        contract: 'StorageUpgrade_Delete_V1',
        label: 'x1',
        type: {
          id: 't_uint256',
        },
      },
    },
  });
});

test('storage upgrade with structs', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Struct_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_Struct_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_Struct_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 1,
    0: {
      kind: 'typechange',
      original: { label: 'data' },
      updated: { label: 'data' },
    },
  });
});

function stabilizeStorageLayout(layout: StorageLayout) {
  return {
    storage: layout.storage.map(s => ({ ...s, type: stabilizeTypeIdentifier(s.type) })),
    types: Object.entries(layout.types).map(([type, item]) => [stabilizeTypeIdentifier(type), item]),
  };
}
