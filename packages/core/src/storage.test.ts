import _test, { TestInterface } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from './solc-api';
import { astDereferencer } from './ast-dereferencer';
import { getStorageUpgradeErrors } from './storage';
import { StorageLayout, isEnumMembers } from './storage/layout';
import { extractStorageLayout } from './storage/extract';
import { stabilizeTypeIdentifier } from './utils/type-id';

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

test('storage upgrade replace', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Replace_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Replace_V2');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 1,
    0: {
      kind: 'replace',
      original: {
        contract: 'StorageUpgrade_Replace_V1',
        label: 'x2',
        type: {
          id: 't_uint256',
        },
      },
      updated: {
        contract: 'StorageUpgrade_Replace_V2',
        label: 'renamed',
        type: {
          id: 't_string_storage',
        },
      },
    },
  });
});

test('storage upgrade rename', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Rename_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Rename_V2');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.like(comparison, {
    length: 1,
    0: {
      kind: 'rename',
      original: {
        contract: 'StorageUpgrade_Rename_V1',
        label: 'x2',
        type: {
          id: 't_uint256',
        },
      },
      updated: {
        contract: 'StorageUpgrade_Rename_V2',
        label: 'renamed',
        type: {
          id: 't_uint256',
        },
      },
    },
  });
});

test('storage upgrade rename allowed', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Rename_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Rename_V2');
  const comparison = getStorageUpgradeErrors(v1, v2, { unsafeAllowRenames: true });
  t.is(comparison.length, 0);
});

test('storage upgrade with obvious mismatch', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_ObviousMismatch_V1');

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_ObviousMismatch_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 3,
    0: {
      kind: 'typechange',
      change: { kind: 'obvious mismatch' },
      original: { label: 'x1' },
      updated: { label: 'x1' },
    },
    1: {
      kind: 'typechange',
      change: { kind: 'obvious mismatch' },
      original: { label: 's1' },
      updated: { label: 's1' },
    },
    2: {
      kind: 'typechange',
      change: { kind: 'obvious mismatch' },
      original: { label: 'a1' },
      updated: { label: 'a1' },
    },
  });
});

test('storage upgrade with structs', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Struct_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_Struct_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_Struct_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 6,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: { kind: 'delete' },
        },
      },
      original: { label: 'data1' },
      updated: { label: 'data1' },
    },
    1: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: { kind: 'append' },
        },
      },
      original: { label: 'data2' },
      updated: { label: 'data2' },
    },
    2: {
      kind: 'typechange',
      change: {
        kind: 'mapping value',
        inner: { kind: 'struct members' },
      },
      original: { label: 'm' },
      updated: { label: 'm' },
    },
    3: {
      kind: 'typechange',
      change: {
        kind: 'array value',
        inner: { kind: 'struct members' },
      },
      original: { label: 'a1' },
      updated: { label: 'a1' },
    },
    4: {
      kind: 'typechange',
      change: {
        kind: 'array value',
        inner: { kind: 'struct members' },
      },
      original: { label: 'a2' },
      updated: { label: 'a2' },
    },
    5: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 3,
          0: { kind: 'typechange' },
          1: { kind: 'typechange' },
          2: { kind: 'typechange' },
        },
      },
      original: { label: 'data3' },
      updated: { label: 'data3' },
    },
  });
});

test('storage upgrade with missing struct members', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Struct_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Struct_V2_Ok');

  const t_struct = Object.keys(v1.types).find(t => stabilizeTypeIdentifier(t) === 't_struct(Struct1)storage');
  if (t_struct === undefined) {
    throw new Error('Struct type not found');
  }

  // Simulate missing struct members
  v1.types[t_struct].members = undefined;

  t.like(getStorageUpgradeErrors(v1, v2), {
    0: {
      kind: 'typechange',
      change: { kind: 'missing members' },
      original: { label: 'data1' },
      updated: { label: 'data1' },
    },
  });

  t.deepEqual(getStorageUpgradeErrors(v1, v2, { unsafeAllowCustomTypes: true }), []);
});

test('storage upgrade with enums', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Enum_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_Enum_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_Enum_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 4,
    0: {
      kind: 'typechange',
      change: {
        kind: 'enum members',
        ops: {
          length: 1,
          0: { kind: 'delete' },
        },
      },
      original: { label: 'data1' },
      updated: { label: 'data1' },
    },
    1: {
      kind: 'typechange',
      change: {
        kind: 'enum members',
        ops: {
          length: 1,
          0: { kind: 'replace', original: 'B', updated: 'X' },
        },
      },
      original: { label: 'data2' },
      updated: { label: 'data2' },
    },
    2: {
      kind: 'typechange',
      change: {
        kind: 'enum members',
        ops: {
          length: 1,
          0: { kind: 'insert', updated: 'X' },
        },
      },
      original: { label: 'data3' },
      updated: { label: 'data3' },
    },
    3: {
      kind: 'typechange',
      change: { kind: 'enum resize' },
      original: { label: 'data4' },
      updated: { label: 'data4' },
    },
  });
});

test('storage upgrade with missing enum members', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Enum_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Enum_V2_Ok');

  const t_enum = Object.keys(v1.types).find(t => stabilizeTypeIdentifier(t) === 't_enum(Enum1)');
  if (t_enum === undefined) {
    throw new Error('Enum type not found');
  }

  // Simulate missing enum members
  v1.types[t_enum].members = undefined;

  t.like(getStorageUpgradeErrors(v1, v2), {
    0: {
      kind: 'typechange',
      change: { kind: 'missing members' },
      original: { label: 'data1' },
      updated: { label: 'data1' },
    },
  });

  t.deepEqual(getStorageUpgradeErrors(v1, v2, { unsafeAllowCustomTypes: true }), []);
});

test('storage upgrade with recursive type', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Recursive_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Recursive_V2');
  const e = t.throws(() => getStorageUpgradeErrors(v1, v2));
  t.true(e.message.includes('Recursion found'));
});

test('storage upgrade with contract type', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Contract_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Contract_V2');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('storage upgrade with arrays', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Array_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_Array_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_Array_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 5,
    0: {
      kind: 'typechange',
      change: { kind: 'array shrink' },
      original: { label: 'x1' },
      updated: { label: 'x1' },
    },
    1: {
      kind: 'typechange',
      change: { kind: 'array grow' },
      original: { label: 'x2' },
      updated: { label: 'x2' },
    },
    2: {
      kind: 'typechange',
      change: { kind: 'array dynamic' },
      original: { label: 'x3' },
      updated: { label: 'x3' },
    },
    3: {
      kind: 'typechange',
      change: { kind: 'array dynamic' },
      original: { label: 'x4' },
      updated: { label: 'x4' },
    },
    4: {
      kind: 'typechange',
      change: {
        kind: 'mapping value',
        inner: { kind: 'array shrink' },
      },
      original: { label: 'm' },
      updated: { label: 'm' },
    },
  });
});

test('storage upgrade with mappings', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Mapping_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_Mapping_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_Mapping_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 2,
    0: {
      kind: 'typechange',
      change: {
        kind: 'mapping value',
        inner: { kind: 'obvious mismatch' },
      },
      original: { label: 'm1' },
      updated: { label: 'm1' },
    },
    1: {
      kind: 'typechange',
      change: { kind: 'mapping key' },
      original: { label: 'm2' },
      updated: { label: 'm2' },
    },
  });
});

test('storage upgrade with enum key in mapping', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_MappingEnumKey_V1');

  const v2_Ok = t.context.extractStorageLayout('StorageUpgrade_MappingEnumKey_V2_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2_Ok), []);

  const v2_Bad = t.context.extractStorageLayout('StorageUpgrade_MappingEnumKey_V2_Bad');
  t.like(getStorageUpgradeErrors(v1, v2_Bad), {
    length: 3,
    0: {
      kind: 'typechange',
      change: {
        kind: 'mapping key',
        inner: { kind: 'enum members' },
      },
      original: { label: 'm2' },
      updated: { label: 'm2' },
    },
    1: {
      kind: 'typechange',
      change: {
        kind: 'mapping key',
        inner: { kind: 'obvious mismatch' },
      },
      original: { label: 'm3' },
      updated: { label: 'm3' },
    },
    2: {
      kind: 'typechange',
      change: {
        kind: 'mapping key',
        inner: { kind: 'obvious mismatch' },
      },
      original: { label: 'm4' },
      updated: { label: 'm4' },
    },
  });
});

function stabilizeStorageLayout(layout: StorageLayout) {
  return {
    storage: layout.storage.map(s => ({ ...s, type: stabilizeTypeIdentifier(s.type) })),
    types: Object.entries(layout.types).map(([type, item]) => {
      const members =
        item.members &&
        (isEnumMembers(item.members)
          ? item.members
          : item.members.map(m => ({ ...m, type: stabilizeTypeIdentifier(m.type) })));
      return [stabilizeTypeIdentifier(type), { ...item, members }];
    }),
  };
}
