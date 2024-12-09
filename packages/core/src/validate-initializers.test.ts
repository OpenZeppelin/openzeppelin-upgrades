import _test, { TestFn } from 'ava';
import { artifacts } from 'hardhat';

import {
  validate,
  getContractVersion,
  assertUpgradeSafe,
  ValidationOptions,
  RunValidation,
  ValidationErrors,
} from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validation: RunValidation;
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const contracts = ['contracts/test/ValidationsInitializer.sol:Parent_NoInitializer'];

  t.context.validation = {} as RunValidation;
  for (const contract of contracts) {
    const buildInfo = await artifacts.getBuildInfo(contract);
    if (buildInfo === undefined) {
      throw new Error(`Build info not found for contract ${contract}`);
    }
    const solcOutput = buildInfo.output;
    const solcInput = buildInfo.input;
    const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
    Object.assign(t.context.validation, validate(solcOutput, decodeSrc));
  }
});

function testValid(name: string, kind: ValidationOptions['kind'], valid: boolean, numExpectedErrors?: number) {
  testOverride(name, kind, {}, valid, numExpectedErrors);
}

function testOverride(
  name: string,
  kind: ValidationOptions['kind'],
  opts: ValidationOptions,
  valid: boolean,
  numExpectedErrors?: number,
) {
  if (numExpectedErrors !== undefined && numExpectedErrors > 0 && valid) {
    throw new Error('Cannot expect errors for a valid contract');
  }

  const optKeys = Object.keys(opts);
  const describeOpts = optKeys.length > 0 ? '(' + optKeys.join(', ') + ')' : '';
  const testName = [valid ? 'accepts' : 'rejects', kind, name, describeOpts].join(' ');
  test(testName, t => {
    const version = getContractVersion(t.context.validation, name);
    const assertUpgSafe = () => assertUpgradeSafe([t.context.validation], version, { kind, ...opts });
    if (valid) {
      t.notThrows(assertUpgSafe);
    } else {
      const error = t.throws(assertUpgSafe) as ValidationErrors;
      if (numExpectedErrors !== undefined) {
        t.is(error.errors.length, numExpectedErrors);
      }
    }
  });
}

testValid('Child_Of_NoInitializer_Ok', 'transparent', true);

testValid('Child_Of_InitializerModifier_Ok', 'transparent', true);
testValid('Child_Of_InitializerModifier_Bad', 'transparent', false, 1);
testValid('Child_Of_InitializerModifier_UsesSuper_Ok', 'transparent', true);

testValid('Child_Of_ReinitializerModifier_Ok', 'transparent', true);
testValid('Child_Of_ReinitializerModifier_Bad', 'transparent', false, 1);

testValid('Child_Of_OnlyInitializingModifier_Ok', 'transparent', true);
testValid('Child_Of_OnlyInitializingModifier_Bad', 'transparent', false, 1);

testValid('MissingInitializer_Bad', 'transparent', false, 1);
testValid('MissingInitializer_UnsafeAllow_Contract', 'transparent', true);
testOverride('MissingInitializer_Bad', 'transparent', { unsafeAllow: ['missing-initializer'] }, true);

testValid('InitializationOrder_Ok', 'transparent', true);
testValid('InitializationOrder_Ok_2', 'transparent', true);

testValid('InitializationOrder_WrongOrder_Bad', 'transparent', false, 1);
testValid('InitializationOrder_WrongOrder_UnsafeAllow_Contract', 'transparent', true);
testValid('InitializationOrder_WrongOrder_UnsafeAllow_Function', 'transparent', true);
testOverride(
  'InitializationOrder_WrongOrder_Bad',
  'transparent',
  { unsafeAllow: ['incorrect-initializer-order'] },
  true,
);

testValid('InitializationOrder_MissingCall_Bad', 'transparent', false, 1);
testValid('InitializationOrder_MissingCall_UnsafeAllow_Contract', 'transparent', true);
testValid('InitializationOrder_MissingCall_UnsafeAllow_Function', 'transparent', true);
testOverride('InitializationOrder_MissingCall_Bad', 'transparent', { unsafeAllow: ['missing-initializer-call'] }, true);

testValid('InitializationOrder_Duplicate_Bad', 'transparent', false, 1);
testValid('InitializationOrder_Duplicate_UnsafeAllow_Contract', 'transparent', true);
testValid('InitializationOrder_Duplicate_UnsafeAllow_Function', 'transparent', true);
testValid('InitializationOrder_Duplicate_UnsafeAllow_Call', 'transparent', true);
testOverride('InitializationOrder_Duplicate_Bad', 'transparent', { unsafeAllow: ['duplicate-initializer-call'] }, true);
