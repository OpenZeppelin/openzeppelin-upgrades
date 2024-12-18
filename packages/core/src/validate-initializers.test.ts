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

function testAccepts(name: string, kind: ValidationOptions['kind']) {
  testOverride(name, kind, {}, undefined);
}

function testRejects(name: string, kind: ValidationOptions['kind'], expectedErrorContains: string) {
  testOverride(name, kind, {}, expectedErrorContains);
}

function testOverride(
  name: string,
  kind: ValidationOptions['kind'],
  opts: ValidationOptions,
  expectErrorContains?: string,
) {
  const expectValid = expectErrorContains === undefined;

  const optKeys = Object.keys(opts);
  const describeOpts = optKeys.length > 0 ? '(' + optKeys.join(', ') + ')' : '';
  const testName = [expectValid ? 'accepts' : 'rejects', kind, name, describeOpts].join(' ');
  test(testName, t => {
    const version = getContractVersion(t.context.validation, name);
    const assertUpgSafe = () => assertUpgradeSafe([t.context.validation], version, { kind, ...opts });
    if (expectValid) {
      t.notThrows(assertUpgSafe);
    } else {
      const error = t.throws(assertUpgSafe) as ValidationErrors;
      t.true(error.message.includes(expectErrorContains), error.message);
    }
  });
}

testAccepts('Child_Of_NoInitializer_Ok', 'transparent');

testAccepts('Child_Of_InitializerModifier_Ok', 'transparent');
testRejects(
  'Child_Of_InitializerModifier_Bad',
  'transparent',
  'Contract is missing initializer calls for one or more parent contracts: `Parent_InitializerModifier`',
);
testAccepts('Child_Of_InitializerModifier_UsesSuper_Ok', 'transparent');

testAccepts('Child_Of_ReinitializerModifier_Ok', 'transparent');
testRejects(
  'Child_Of_ReinitializerModifier_Bad',
  'transparent',
  'Contract is missing initializer calls for one or more parent contracts: `Parent_ReinitializerModifier`',
);

testAccepts('Child_Of_OnlyInitializingModifier_Ok', 'transparent');
testRejects(
  'Child_Of_OnlyInitializingModifier_Bad',
  'transparent',
  'Contract is missing initializer calls for one or more parent contracts: `Parent__OnlyInitializingModifier`',
);

testRejects('MissingInitializer_Bad', 'transparent', 'Contract is missing an initializer');
testAccepts('MissingInitializer_UnsafeAllow_Contract', 'transparent');
testOverride('MissingInitializer_Bad', 'transparent', { unsafeAllow: ['missing-initializer'] });

testAccepts('InitializationOrder_Ok', 'transparent');
testAccepts('InitializationOrder_Ok_2', 'transparent');

testRejects(
  'InitializationOrder_WrongOrder_Bad',
  'transparent',
  'Contract has an incorrect order of parent initializer calls. Expected initializers to be called for parent contracts in the following order: A, B, C',
);
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_WrongOrder_Bad', 'transparent', { unsafeAllow: ['incorrect-initializer-order'] });

testRejects(
  'InitializationOrder_MissingCall_Bad',
  'transparent',
  'Contract is missing initializer calls for one or more parent contracts: `C`',
);
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_MissingCall_Bad', 'transparent', { unsafeAllow: ['missing-initializer-call'] });

testRejects(
  'InitializationOrder_Duplicate_Bad',
  'transparent',
  'Contract has duplicate calls to parent initializer `__B_init` for contract `B`',
);
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Function', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Call', 'transparent');
testOverride('InitializationOrder_Duplicate_Bad', 'transparent', { unsafeAllow: ['duplicate-initializer-call'] });
testRejects(
  'InitializationOrder_UnsafeAllowDuplicate_But_WrongOrder',
  'transparent',
  'Contract has an incorrect order of parent initializer calls. Expected initializers to be called for parent contracts in the following order: A, B, C',
);

testAccepts('Child_Of_ParentPrivateInitializer_Ok', 'transparent');
testAccepts('Child_Of_ParentPublicInitializer_Ok', 'transparent');
testRejects('Child_Has_PrivateInitializer_Bad', 'transparent', 'Contract is missing an initializer');
