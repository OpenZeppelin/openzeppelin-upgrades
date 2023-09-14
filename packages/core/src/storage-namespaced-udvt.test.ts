import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll, astDereferencer } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from './solc-api';
import { getStorageUpgradeErrors } from './storage';
import { StorageLayout } from './storage/layout';
import { extractStorageLayout } from './storage/extract';

interface Context {
  extractStorageLayout: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/NamespacedUDVT.sol:NamespacedUVDT_MappingKey_V1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  const contracts: Record<string, ContractDefinition> = {};
  const storageLayouts: Record<string, StorageLayout> = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/NamespacedUDVT.sol'].ast)) {
    contracts[def.name] = def;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    storageLayouts[def.name] = solcOutput.contracts['contracts/test/NamespacedUDVT.sol'][def.name].storageLayout!;
  }
  const deref = astDereferencer(solcOutput);
  t.context.extractStorageLayout = name =>
    extractStorageLayout(contracts[name], dummyDecodeSrc, deref, storageLayouts[name]);
});

const dummyDecodeSrc = () => 'file.sol:1';

test('user defined value types - no layout info', async t => {
  const v1 = t.context.extractStorageLayout('NamespacedUDVT_NoLayout');
  const v2 = t.context.extractStorageLayout('NamespacedUDVT_NoLayout_V2_Ok');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('user defined value types - layout info - bad underlying type', async t => {
  const v1 = t.context.extractStorageLayout('NamespacedUDVT_Layout');
  const v2 = t.context.extractStorageLayout('NamespacedUDVT_Layout_V2_Bad');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 2,
    // index 0 is only the $MainStorage variable which we added for the test to get storage layouts
    1: {
      kind: 'typechange',
      change: {
        kind: 'type resize',
      },
      original: { label: 'my_user_value' },
      updated: { label: 'my_user_value' },
    },
  });
});

test('mapping with user defined value type key - ok', t => {
  const v1 = t.context.extractStorageLayout('NamespacedUVDT_MappingKey_V1');
  const v2 = t.context.extractStorageLayout('NamespacedUVDT_MappingKey_V2_Ok');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.deepEqual(comparison, []);
});

test('mapping with user defined value type key - bad', t => {
  const v1 = t.context.extractStorageLayout('NamespacedUVDT_MappingKey_V1');
  const v2 = t.context.extractStorageLayout('NamespacedUVDT_MappingKey_V2_Bad');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 3,
    // index 0 is only the $MainStorage variable which we added for the test to get storage layouts
    1: {
      kind: 'typechange',
      change: {
        kind: 'mapping key',
      },
      original: { label: 'm1' },
      updated: { label: 'm1' },
    },
    2: {
      kind: 'typechange',
      change: {
        kind: 'mapping key',
      },
      original: { label: 'm2' },
      updated: { label: 'm2' },
    },
  });
});