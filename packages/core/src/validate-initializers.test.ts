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

interface ExpectedErrors {
  contains: string[];
  count: number;
}

function testRejects(name: string, kind: ValidationOptions['kind'], expectedErrors: ExpectedErrors) {
  testOverride(name, kind, {}, expectedErrors);
}

function testOverride(
  name: string,
  kind: ValidationOptions['kind'],
  opts: ValidationOptions,
  expectedErrors?: ExpectedErrors,
) {
  const expectValid = expectedErrors === undefined;

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
        error.errors.length === expectedErrors.count,
        `Expected ${expectedErrors.count} errors, got ${error.errors.length}:\n${error.message}`,
      );
      t.true(
        expectedErrors?.contains.every(c => error.message.includes(c)),
        error.message,
      );
    }
  });
}

testAccepts('Child_Of_NoInitializer_Ok', 'transparent');

testAccepts('Child_Of_InitializerModifier_Ok', 'transparent');
testRejects('Child_Of_InitializerModifier_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_InitializerModifier`'],
  count: 1,
});
testAccepts('Child_Of_InitializerModifier_UsesSuper_Ok', 'transparent');

testAccepts('Child_Of_OnlyInitializingModifier_Ok', 'transparent');
testRejects('Child_Of_OnlyInitializingModifier_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent__OnlyInitializingModifier`'],
  count: 1,
});

testRejects('MissingInitializer_Bad', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testAccepts('MissingInitializer_UnsafeAllow_Contract', 'transparent');
testOverride('MissingInitializer_Bad', 'transparent', { unsafeAllow: ['missing-initializer'] });

testAccepts('ValidateAsInitializer_Ok', 'transparent');

testRejects('Reinitializer_NotDetected', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testAccepts('Reinitializer_ValidateAsInitializer_Ok', 'transparent');

testAccepts('InitializationOrder_Ok', 'transparent');
testAccepts('InitializationOrder_Ok_2', 'transparent');

testAccepts('InitializationOrder_WrongOrder_Bad', 'transparent'); // warn 'Expected: A, B, C'
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_WrongOrder_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_WrongOrder_Bad', 'transparent', { unsafeAllow: ['incorrect-initializer-order'] }); // skips the warning

testRejects('InitializationOrder_MissingCall_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `C`'],
  count: 1,
});
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_MissingCall_UnsafeAllow_Function', 'transparent');
testOverride('InitializationOrder_MissingCall_Bad', 'transparent', { unsafeAllow: ['missing-initializer-call'] });

testRejects('InitializationOrder_Duplicate_Bad', 'transparent', {
  contains: ['Duplicate calls found to initializer `__B_init` for contract `B`'],
  count: 1,
});
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Contract', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Function', 'transparent');
testAccepts('InitializationOrder_Duplicate_UnsafeAllow_Call', 'transparent');
testOverride('InitializationOrder_Duplicate_Bad', 'transparent', { unsafeAllow: ['duplicate-initializer-call'] });
testAccepts('InitializationOrder_UnsafeAllowDuplicate_But_WrongOrder', 'transparent'); // warn 'Expected: A, B, C'

testAccepts('InitializationOrder_ValidateAsInitializer_Ok', 'transparent');
testAccepts('InitializationOrder_ValidateAsInitializer_WrongOrder', 'transparent'); // warn 'Expected: A, B, C, Parent_ValidateAsInitializer'
testRejects('InitializationOrder_ValidateAsInitializer_MissingCall', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_ValidateAsInitializer`'],
  count: 1,
});
testRejects('InitializationOrder_ValidateAsInitializer_DuplicateCall', 'transparent', {
  contains: ['Duplicate calls found to initializer `parentAssumeInit` for contract `Parent_ValidateAsInitializer`'],
  count: 1,
});

testAccepts('Parent_ValidateAsInitializer_External_Ok', 'transparent');
testAccepts('Child_Of_ValidateAsInitializer_External_Ok', 'transparent');

testAccepts('WithRequire_Ok', 'transparent');
testRejects('WithRequire_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent__OnlyInitializingModifier`'],
  count: 1,
});

testAccepts('Child_Of_Private_Ok', 'transparent');
testAccepts('Child_Of_Public_Ok', 'transparent');
testRejects('Child_Of_Public_MissingCall_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_Public`'],
  count: 1,
});
testAccepts('Child_Of_External_Ok', 'transparent');
testRejects('Child_Of_Internal_Bad', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testRejects('Child_Of_Internal_Has_Private_Bad', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testAccepts('Child_Of_Internal_Has_Public_Ok', 'transparent');
testAccepts('Child_Of_Internal_Has_Internal_Ok', 'transparent');
testAccepts('Child_Of_Internal_Has_External_Ok', 'transparent');
testAccepts('Child_Of_PrivatePublicExternal_Ok', 'transparent');
testRejects('Child_Of_AllVisibilities_Bad', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testRejects('Child_Of_AllVisibilities_EmptyInitializer_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_Public, Parent_Internal`'],
  count: 1,
});

testRejects('Child_Of_MultiplePublic_MissingInitializer_Bad', 'transparent', {
  contains: ['Missing initializer'],
  count: 1,
});
testRejects('Child_Of_MultiplePublic_MissingCall_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_Public_2`'],
  count: 1,
});
testAccepts('Child_Of_MultiplePublic_Ok', 'transparent');

testAccepts('TransitiveParent_Ok', 'transparent');
testRejects('TransitiveParent_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`'],
  count: 1,
});
testRejects('TransitiveChild_Bad_Parent', 'transparent', {
  contains: [
    'Missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`', // occurs twice: missing initializer for child, missing initializer for parent
  ],
  count: 2,
}); // warn 'Expected: TransitiveGrandparent2, TransitiveParent_Bad'
testRejects('TransitiveChild_Bad_Order', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`'],
  count: 1,
}); // warn 'Expected: TransitiveGrandparent2, TransitiveParent_Bad'
testRejects('TransitiveChild_Good_Order_Bad_Parent', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `TransitiveGrandparent2`'],
  count: 1,
});
testRejects('TransitiveDuplicate_Bad', 'transparent', {
  contains: [
    'Duplicate calls found to initializer `__TransitiveGrandparent1_init` for contract `TransitiveGrandparent1`',
  ],
  count: 1,
});

testAccepts('Ownable_Ok', 'transparent');
testAccepts('Ownable2Step_Ok', 'transparent');
testRejects('Ownable2Step_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `OwnableUpgradeable`'],
  count: 1,
});

testRejects('SkipsParent_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent`'],
  count: 1,
});
testRejects('DuplicateInHelpers_Bad', 'transparent', {
  contains: ['Duplicate calls found to initializer `__Grandparent_init` for contract `Grandparent`'],
  count: 1,
});
testRejects('Recursive_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent`'],
  count: 1,
});
testAccepts('Recursive_Ok', 'transparent');

testAccepts('Child_With_Unchained_Ok', 'transparent');
testRejects('Child_Missing_Parent_Unchained_Call_Bad', 'transparent', {
  contains: ['Missing initializer calls for one or more parent contracts: `Parent_With_Unchained`'],
  count: 1,
});
testRejects('Child_Duplicate_Parent_Unchained_Call_Bad', 'transparent', {
  contains: ['Duplicate calls found to initializer `__Parent_init_unchained` for contract `Parent_With_Unchained`'],
  count: 1,
});
testAccepts('Child_Wrong_Order_Parent_Unchained_Call_Warning', 'transparent'); // warn 'Expected: Parent_With_Unchained, Parent2_With_Unchained'

testAccepts('ERC20_Ok', 'uups');
testRejects('ERC20_Bad', 'uups', {
  contains: [
    'Missing initializer calls for one or more parent contracts: `ERC20Upgradeable, OwnableUpgradeable, ERC20PermitUpgradeable`',
  ],
  count: 1,
});
