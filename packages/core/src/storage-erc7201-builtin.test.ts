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
  extractStorageLayoutFallback: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestFn<Context>;

const SOURCE = 'contracts/test/Erc7201Builtin.sol';

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo(`${SOURCE}:Erc7201Builtin`);
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  const contracts: Record<string, ContractDefinition> = {};
  const storageLayouts: Record<string, StorageLayout> = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources[SOURCE].ast)) {
    contracts[def.name] = def;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    storageLayouts[def.name] = solcOutput.contracts[SOURCE][def.name].storageLayout!;
  }
  const deref = astDereferencer(solcOutput);

  t.context.extractStorageLayout = name =>
    extractStorageLayout(contracts[name], dummyDecodeSrc, deref, storageLayouts[name]);

  t.context.extractStorageLayoutFallback = name =>
    extractStorageLayout(contracts[name], dummyDecodeSrc, deref, undefined);
});

const dummyDecodeSrc = () => 'file.sol:1';

test('erc7201 builtin base slot - extract', t => {
  const layout = t.context.extractStorageLayout('Erc7201Builtin');
  t.is(layout.baseSlot, '0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500');
  t.is(layout.storage.length, 1);
  t.is(layout.storage[0].label, 'a');
});

test('erc7201 builtin base slot - append - ok', t => {
  const v1 = t.context.extractStorageLayout('Erc7201Builtin');
  const v2 = t.context.extractStorageLayout('Erc7201Builtin_Append_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('erc7201 builtin base slot - append - fallback - ok', t => {
  const v1 = t.context.extractStorageLayoutFallback('Erc7201Builtin');
  const v2 = t.context.extractStorageLayoutFallback('Erc7201Builtin_Append_Ok');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('erc7201 builtin base slot - changed id - bad', t => {
  const v1 = t.context.extractStorageLayout('Erc7201Builtin');
  const v2 = t.context.extractStorageLayout('Erc7201Builtin_Changed_Id_Bad');
  const comparison = getStorageUpgradeErrors(v1, v2);
  t.true(comparison.length > 0);
  t.is(comparison[0].kind, 'layoutchange');
});

test('erc7201 builtin base slot - changed id - fallback - bad', t => {
  const v1 = t.context.extractStorageLayoutFallback('Erc7201Builtin');
  const v2 = t.context.extractStorageLayoutFallback('Erc7201Builtin_Changed_Id_Bad');
  // Base slot differs between the two erc7201 ids, so the fallback base-slot check must fail.
  t.throws(() => getStorageUpgradeErrors(v1, v2));
});

test('erc7201 builtin and literal-equivalent base slots compare equal', t => {
  const builtin = t.context.extractStorageLayout('Erc7201Builtin');
  const literal = t.context.extractStorageLayout('Erc7201Builtin_Literal_Equivalent');
  // Both resolve to the same base slot; the fallback (base-slot) check must treat them as unchanged.
  const builtinFallback = t.context.extractStorageLayoutFallback('Erc7201Builtin');
  const literalFallback = t.context.extractStorageLayoutFallback('Erc7201Builtin_Literal_Equivalent');
  t.deepEqual(getStorageUpgradeErrors(builtin, literal), []);
  t.deepEqual(getStorageUpgradeErrors(builtinFallback, literalFallback), []);
});

test('erc7201 builtin base slot clashes with namespace - error', t => {
  t.throws(() => t.context.extractStorageLayout('Erc7201Builtin_Clash'), {
    message:
      /Custom layout for contract Erc7201Builtin_Clash clashes with the storage location for namespace erc7201:example\.main/,
  });
});

test('erc7201 builtin base slot different from namespace - no error and no warning', t => {
  const warnings = captureWarnings(() => {
    const layout = t.context.extractStorageLayout('Erc7201Builtin_NoClash_NoWarning');
    t.truthy(layout.baseSlot);
  });
  t.deepEqual(warnings, []);
});

test('erc7201 builtin accepts a unicode string literal argument', t => {
  const layout = t.context.extractStorageLayout('Erc7201Builtin_Unicode');
  t.is(layout.baseSlot, '0x2d3e72b7d91644a80150e2643e65016def7067dc9568719707e7eca1a5dab800');
});

test('literal base slot with namespace - warning not suppressed', t => {
  const warnings = captureWarnings(() => t.context.extractStorageLayout('Erc7201Builtin_LiteralBase_Warns'));
  t.true(warnings.some(w => w.includes('custom storage layout')));
});

function captureWarnings(fn: () => void): string[] {
  const warnings: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.error = original;
  }
  return warnings;
}
