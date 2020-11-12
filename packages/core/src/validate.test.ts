import _test, { TestInterface } from 'ava';
import { artifacts } from 'hardhat';

import {
  validate,
  isUpgradeSafe,
  getStorageLayout,
  getContractVersion,
  assertUpgradeSafe,
  ValidationOptions,
  ValidationLog,
} from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validations: ValidationLog;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/Validations.sol:HasStruct');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput = buildInfo.output;
  const solcInput = buildInfo.input;
  const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
  t.context.validations = [validate(solcOutput, decodeSrc)];
});

function testValid(name: string, valid: boolean) {
  test(name, t => {
    const version = getContractVersion(t.context.validations, name, 0);
    t.is(isUpgradeSafe(t.context.validations, version), valid);
  });
}

function testOverride(name: string, opts: ValidationOptions, valid: boolean) {
  const testName = name.concat(valid ? '_Allowed' : '_NotAllowed');
  test(testName, t => {
    const version = getContractVersion(t.context.validations, name, 0);
    const assertUpgSafe = () => assertUpgradeSafe(t.context.validations, version, opts);
    if (valid) {
      t.notThrows(assertUpgSafe);
    } else {
      t.throws(assertUpgSafe);
    }
  });
}

testValid('HasEmptyConstructor', true);
testValid('HasConstantStateVariableAssignment', true);
testValid('HasStateVariable', true);
testValid('UsesImplicitSafeInternalLibrary', true);
testValid('UsesExplicitSafeInternalLibrary', true);

testValid('HasNonEmptyConstructor', false);
testValid('ParentHasNonEmptyConstructor', false);
testValid('AncestorHasNonEmptyConstructor', false);
testValid('HasStateVariableAssignment', false);
testValid('HasImmutableStateVariable', false);
testValid('HasSelfDestruct', false);
testValid('HasDelegateCall', false);
testValid('ImportedParentHasStateVariableAssignment', false);
testValid('UsesImplicitUnsafeInternalLibrary', false);
testValid('UsesExplicitUnsafeInternalLibrary', false);
testValid('UsesImplicitUnsafeExternalLibrary', false);
testValid('UsesExplicitUnsafeExternalLibrary', false);

// Linked external libraries are not yet supported
// see: https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
testValid('UsesImplicitSafeExternalLibrary', false);
testValid('UsesExplicitSafeExternalLibrary', false);

// Custom types (structs and enums) are not yet supported
// see: https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/3
testValid('HasStruct', false);
testValid('ParentHasStruct', false);
testValid('UsesLibraryWithStruct', false);
testValid('HasEnum', false);
testValid('ParentHasEnum', false);
testValid('UsesLibraryWithEnum', false);

test('inherited storage', t => {
  const version = getContractVersion(t.context.validations, 'StorageInheritChild', 0);
  const layout = getStorageLayout(t.context.validations, version);
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});

testOverride('HasStruct', { unsafeAllowCustomTypes: true }, true);
testOverride('ParentHasStruct', { unsafeAllowCustomTypes: true }, true);
testOverride('UsesLibraryWithStruct', { unsafeAllowCustomTypes: true }, true);
testOverride('HasEnum', { unsafeAllowCustomTypes: true }, true);
testOverride('ParentHasEnum', { unsafeAllowCustomTypes: true }, true);
testOverride('UsesLibraryWithEnum', { unsafeAllowCustomTypes: true }, true);

testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
