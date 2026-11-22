import _test, { TestFn } from 'ava';
import { artifacts } from 'hardhat';

import { validate, getContractVersion, RunValidation } from '../validate';
import { getAnnotationArgs } from './run';
import { solcInputOutputDecoder } from '../src-decoder';
import { assertSelectorClashFree, getSelectorClashErrors } from './selector-clash';
import { ValidationErrors } from './error';

interface Context {
  validation: RunValidation;
  buildInfoOutput: Record<string, { evm: { methodIdentifiers?: Record<string, string> } }>;
}

const test = _test as TestFn<Context>;

const file = 'contracts/test/SelectorClash.sol';

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo(`${file}:SelectorClashV1`);
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
  t.context.validation = validate(buildInfo.output, decodeSrc);
  t.context.buildInfoOutput = buildInfo.output.contracts[file];
});

function check(t: { context: Context }, original: string, updated: string, opts = {}) {
  assertSelectorClashFree(
    [t.context.validation],
    getContractVersion(t.context.validation, `${file}:${original}`),
    [t.context.validation],
    getContractVersion(t.context.validation, `${file}:${updated}`),
    opts,
  );
}

test('rejects a clash with a previous function', t => {
  const error = t.throws(() => check(t, 'SelectorClashV1', 'SelectorClashV2Bad'), { instanceOf: ValidationErrors });
  t.deepEqual(
    error?.errors.map(e => e.kind),
    ['selector-clash'],
  );
  t.like(error?.errors[0], {
    kind: 'selector-clash',
    selector: '0x42966c68',
    original: 'collate_propagate_storage(bytes16)',
    updated: 'burn(uint256)',
  });
});

test('rejects a clash with an inherited function', t => {
  t.throws(() => check(t, 'SelectorClashV1', 'SelectorClashV2Inherited'), { instanceOf: ValidationErrors });
});

test('accepts the same contract', t => {
  t.notThrows(() => check(t, 'SelectorClashV1', 'SelectorClashV1'));
});

test('accepts a renamed function without a clash', t => {
  t.notThrows(() => check(t, 'SelectorClashV1', 'SelectorClashV2Ok'));
});

test('unsafeAllow skips the check', t => {
  t.notThrows(() => check(t, 'SelectorClashV1', 'SelectorClashV2Bad', { unsafeAllow: ['selector-clash'] }));
});

test('signatures match the compiler method identifiers', t => {
  const { abiMethods } = t.context.validation[`${file}:SelectorClashCanonical`];
  const identifiers = Object.keys(t.context.buildInfoOutput.SelectorClashCanonical.evm.methodIdentifiers ?? {});
  t.deepEqual([...(abiMethods ?? [])].sort(), identifiers.sort());
});

test('fails closed without ABI signatures', t => {
  const run = {
    'A.sol:A': { src: 'A.sol:1', inherit: [], abiMethods: ['burn(uint256)'] },
    'B.sol:B': { src: 'B.sol:1', inherit: [] },
  } as unknown as RunValidation;
  const message = { message: /Could not determine function selectors for contract `B.sol:B`/ };
  t.throws(() => getSelectorClashErrors(run, 'A.sol:A', run, 'B.sol:B'), message);
  t.throws(() => getSelectorClashErrors(run, 'B.sol:B', run, 'A.sol:A'), message);
  t.deepEqual(getSelectorClashErrors(run, 'A.sol:A', run, 'B.sol:B', { unsafeAllow: ['selector-clash'] }), []);
});

test('selector-clash cannot be allowed with an annotation', t => {
  t.throws(() => getAnnotationArgs('@custom:oz-upgrades-unsafe-allow selector-clash', 'oz-upgrades-unsafe-allow'));
});
