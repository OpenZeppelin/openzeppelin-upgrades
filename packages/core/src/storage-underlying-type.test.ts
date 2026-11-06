import _test, { TestFn } from 'ava';
import { artifacts } from 'hardhat';

import { validate, ValidationRunData } from './validate';
import { withValidationDefaults } from './validate/overrides';
import { solcInputOutputDecoder } from './src-decoder';
import { getStorageUpgradeErrors, getStorageUpgradeReport } from './storage';
import { StorageLayout } from './storage/layout';

const sources = {
  'contracts/test/UnderlyingTypeV1.sol': ['UnderlyingTypeV1'],
  'contracts/test/UnderlyingTypeV2.sol': [
    'UnderlyingTypeUnannotated',
    'UnderlyingTypeAnnotated',
    'UnderlyingTypeOwnTypeAnnotated',
    'UnderlyingTypeResized',
  ],
};

interface Context {
  layouts: Record<string, StorageLayout>;
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const validations: Record<string, ValidationRunData> = {};
  t.context.layouts = {};
  for (const [source, contracts] of Object.entries(sources)) {
    const buildInfo = await artifacts.getBuildInfo(`${source}:${contracts[0]}`);
    if (buildInfo === undefined) {
      throw new Error(`Build info not found for ${source}`);
    }
    const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
    const validation = (validations[buildInfo.id] ??= validate(
      buildInfo.output,
      decodeSrc,
      buildInfo.solcVersion,
      buildInfo.input,
    ));
    for (const contract of contracts) {
      t.context.layouts[contract] = validation[`${source}:${contract}`].layout;
    }
  }
});

function explain(original: StorageLayout, updated: StorageLayout) {
  return getStorageUpgradeReport(original, updated, withValidationDefaults({})).explain(false);
}

const HINT = 'If this change is intended and you have checked that it is safe for the stored values, annotate';

test('unannotated', t => {
  const { UnderlyingTypeV1, UnderlyingTypeUnannotated } = t.context.layouts;
  t.like(getStorageUpgradeErrors(UnderlyingTypeV1, UnderlyingTypeUnannotated), {
    length: 3,
    0: {
      kind: 'typechange',
      change: { kind: 'underlying type' },
      original: { label: 'a' },
      updated: { label: 'a' },
    },
    1: {
      kind: 'typechange',
      change: { kind: 'mapping value', inner: { kind: 'underlying type' } },
      original: { label: 'm' },
      updated: { label: 'm' },
    },
    2: {
      kind: 'typechange',
      change: { kind: 'array value', inner: { kind: 'underlying type' } },
      original: { label: 'list' },
      updated: { label: 'list' },
    },
  });
});

test('unannotated report', t => {
  const { UnderlyingTypeV1, UnderlyingTypeUnannotated } = t.context.layouts;
  t.is(
    explain(UnderlyingTypeV1, UnderlyingTypeUnannotated),
    'contracts/test/UnderlyingTypeV2.sol:9: Upgraded `a` to an incompatible type\n' +
      '  - Bad upgrade to Amount\n' +
      '    Underlying type changed from uint128 to int128\n' +
      `  > ${HINT} \`a\` with '@custom:oz-retyped-from uint128'\n` +
      '\n' +
      'contracts/test/UnderlyingTypeV2.sol:10: Upgraded `m` to an incompatible type\n' +
      '  - In mapping(address => Amount)\n' +
      '    - Bad upgrade to Amount\n' +
      '      Underlying type changed from uint128 to int128\n' +
      `  > ${HINT} \`m\` with '@custom:oz-retyped-from mapping(address => uint128)'\n` +
      '\n' +
      'contracts/test/UnderlyingTypeV2.sol:11: Upgraded `list` to an incompatible type\n' +
      '  - In Amount[]\n' +
      '    - Bad upgrade to Amount\n' +
      '      Underlying type changed from uint128 to int128\n' +
      `  > ${HINT} \`list\` with '@custom:oz-retyped-from uint128[]'`,
  );
});

test('annotated', t => {
  // The annotations are the ones that the errors of the unannotated upgrade suggest
  const { UnderlyingTypeV1, UnderlyingTypeAnnotated } = t.context.layouts;
  t.deepEqual(getStorageUpgradeErrors(UnderlyingTypeV1, UnderlyingTypeAnnotated), []);
});

test('kept annotations', t => {
  // Upgrading from and to the same contract: the annotations from the earlier upgrade don't apply to this upgrade
  const { UnderlyingTypeAnnotated } = t.context.layouts;
  t.deepEqual(getStorageUpgradeErrors(UnderlyingTypeAnnotated, UnderlyingTypeAnnotated), []);
});

test('annotations that name the own type', t => {
  // Such an annotation would match again in every later upgrade, so it does not allow the underlying type to change
  const { UnderlyingTypeV1, UnderlyingTypeOwnTypeAnnotated } = t.context.layouts;
  t.like(getStorageUpgradeErrors(UnderlyingTypeV1, UnderlyingTypeOwnTypeAnnotated), {
    length: 3,
    0: {
      kind: 'typechange',
      change: { kind: 'underlying type' },
      original: { label: 'a' },
      updated: { label: 'a', retypedFrom: 'Amount' },
    },
    1: {
      kind: 'typechange',
      change: { kind: 'mapping value', inner: { kind: 'underlying type' } },
      original: { label: 'm' },
      updated: { label: 'm', retypedFrom: 'mapping(address => Amount)' },
    },
    2: {
      kind: 'typechange',
      change: { kind: 'array value', inner: { kind: 'underlying type' } },
      original: { label: 'list' },
      updated: { label: 'list', retypedFrom: 'Amount[]' },
    },
  });
});

test('annotations that name the own type report', t => {
  const { UnderlyingTypeV1, UnderlyingTypeOwnTypeAnnotated } = t.context.layouts;
  t.is(
    explain(UnderlyingTypeV1, UnderlyingTypeOwnTypeAnnotated),
    'contracts/test/UnderlyingTypeV2.sol:26: Upgraded `a` to an incompatible type\n' +
      '  - Bad upgrade to Amount\n' +
      '    Underlying type changed from uint128 to int128\n' +
      "  > The annotation '@custom:oz-retyped-from Amount' is ignored, because it names the type in both versions\n" +
      `  > ${HINT} \`a\` with '@custom:oz-retyped-from uint128'\n` +
      '\n' +
      'contracts/test/UnderlyingTypeV2.sol:28: Upgraded `m` to an incompatible type\n' +
      '  - In mapping(address => Amount)\n' +
      '    - Bad upgrade to Amount\n' +
      '      Underlying type changed from uint128 to int128\n' +
      "  > The annotation '@custom:oz-retyped-from mapping(address => Amount)' is ignored, because it names the type in both versions\n" +
      `  > ${HINT} \`m\` with '@custom:oz-retyped-from mapping(address => uint128)'\n` +
      '\n' +
      'contracts/test/UnderlyingTypeV2.sol:30: Upgraded `list` to an incompatible type\n' +
      '  - In Amount[]\n' +
      '    - Bad upgrade to Amount\n' +
      '      Underlying type changed from uint128 to int128\n' +
      "  > The annotation '@custom:oz-retyped-from Amount[]' is ignored, because it names the type in both versions\n" +
      `  > ${HINT} \`list\` with '@custom:oz-retyped-from uint128[]'`,
  );
});

test('annotated with a size change', t => {
  const { UnderlyingTypeV1, UnderlyingTypeResized } = t.context.layouts;
  t.like(getStorageUpgradeErrors(UnderlyingTypeV1, UnderlyingTypeResized), {
    length: 1,
    0: {
      kind: 'layoutchange',
      change: { bytes: { from: '16', to: '8' } },
      original: { label: 'a' },
      updated: { label: 'a' },
    },
  });
});

test('original layout without underlying types', t => {
  // Layouts written by versions that did not record the underlying type are compared by size only
  const { UnderlyingTypeV1, UnderlyingTypeUnannotated } = t.context.layouts;
  const original = structuredClone(UnderlyingTypeV1);
  for (const type of Object.values(original.types)) {
    delete type.underlying;
  }
  t.deepEqual(getStorageUpgradeErrors(original, UnderlyingTypeUnannotated), []);
});
