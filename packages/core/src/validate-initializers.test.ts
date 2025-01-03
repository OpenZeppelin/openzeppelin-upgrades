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

function testRejects(
  name: string,
  kind: ValidationOptions['kind'],
  expectedError?: {
    contains: string;
    count: number;
  },
) {
  testOverride(name, kind, {}, expectedError);
}

function testOverride(
  name: string,
  kind: ValidationOptions['kind'],
  opts: ValidationOptions,
  expectedError?: {
    contains: string;
    count: number;
  },
) {
  const expectValid = expectedError === undefined;

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
      t.true(
        error.errors.length === expectedError.count,
        `Expected ${expectedError.count} errors, got ${error.errors.length}:\n${error.message}`,
      );
      t.true(error.message.includes(expectedError.contains), error.message);
    }
  });
}

testAccepts('Child_Of_NoInitializer_Ok', 'transparent');

testAccepts('Child_Of_InitializerModifier_Ok', 'transparent');
testRejects('Child_Of_InitializerModifier_Bad', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `Parent_InitializerModifier`',
  count: 1,
});
testAccepts('Child_Of_InitializerModifier_UsesSuper_Ok', 'transparent');

testAccepts('Child_Of_ReinitializerModifier_Ok', 'transparent');
testRejects('Child_Of_ReinitializerModifier_Bad', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `Parent_ReinitializerModifier`',
  count: 1,
});

testAccepts('Child_Of_OnlyInitializingModifier_Ok', 'transparent');
testRejects('Child_Of_OnlyInitializingModifier_Bad', 'transparent', {
  contains:
    'Contract is missing initializer calls for one or more parent contracts: `Parent__OnlyInitializingModifier`',
  count: 1,
});

testRejects('MissingInitializer_Bad', 'transparent', {
  contains: 'Contract is missing an initializer',

  count: 1,
});
testAccepts('MissingInitializer_UnsafeAllow_Contract', 'transparent');
testOverride('MissingInitializer_Bad', 'transparent', { unsafeAllow: ['missing-initializer'] });

testAccepts('InitializationOrder_Ok', 'transparent');
testAccepts('InitializationOrder_Ok_2', 'transparent');

testRejects('InitializationOrder_WrongOrder_Bad', 'transparent', {
  contains: 'Expected initializers to be called for parent contracts in the following order: A, B, C',
  count: 1,
});
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_WrongOrder_Bad', 'transparent', { unsafeAllow: ['incorrect-initializer-order'] });

testRejects('InitializationOrder_MissingCall_Bad', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `C`',
  count: 1,
});
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_MissingCall_Bad', 'transparent', { unsafeAllow: ['missing-initializer-call'] });

testRejects('InitializationOrder_Duplicate_Bad', 'transparent', {
  contains: 'Contract has duplicate calls to parent initializer `__B_init` for contract `B`',
  count: 1,
});
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Function', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Call', 'transparent');
testOverride('InitializationOrder_Duplicate_Bad', 'transparent', { unsafeAllow: ['duplicate-initializer-call'] });
testRejects('InitializationOrder_UnsafeAllowDuplicate_But_WrongOrder', 'transparent', {
  contains: 'Expected initializers to be called for parent contracts in the following order: A, B, C',
  count: 1,
});

testAccepts('Child_Of_ParentPrivateInitializer_Ok', 'transparent');
testAccepts('Child_Of_ParentPublicInitializer_Ok', 'transparent');
testRejects('Child_Has_PrivateInitializer_Bad', 'transparent', {
  contains: 'Contract is missing an initializer',
  count: 1,
});

testAccepts('TransitiveParent_Ok', 'transparent');
testRejects('TransitiveParent_Bad', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`',
  count: 1,
});
testRejects('TransitiveChild_Bad_Parent', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`',
  count: 3, // should be 2 if we ignore wrong order.  the errors are: missing for child, missing for parent
});
testRejects('TransitiveChild_Bad_Order', 'transparent', {
  contains:
    'Expected initializers to be called for parent contracts in the following order: TransitiveGrandparent2, TransitiveParent_Bad',
  count: 2,
}); // should have 2 errors: 'Expected initializers to be called for parent contracts in the following order: TransitiveGrandparent2, TransitiveParent_Bad', 'Contract is missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`'
// but 1 if we ignore wrong order
testRejects('TransitiveChild_Bad_Order2', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`',
  count: 1,
});
testRejects('TransitiveDuplicate_Bad', 'transparent', {
  contains: 'Contract has duplicate calls to parent',
  count: 1,
});
// should allow this if we ignore duplicate calls transitively

testAccepts('Ownable_Ok', 'transparent');
testAccepts('Ownable2Step_Ok', 'transparent');
testRejects('Ownable2Step_Bad', 'transparent', {
  contains: 'Contract is missing initializer calls for one or more parent contracts: `OwnableUpgradeable`',
  count: 1,
});
