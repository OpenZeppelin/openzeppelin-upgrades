import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';

import {
  validate,
  isUpgradeSafe,
  getStorageLayout,
  getContractVersion,
  Validation,
  assertUpgradeSafe,
  ValidationOptions,
} from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validation: Validation;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcInput = JSON.parse(await fs.readFile('cache/solc-input.json', 'utf8'));
  const solcOutput = JSON.parse(await fs.readFile('cache/solc-output.json', 'utf8'));
  const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
  t.context.validation = validate(solcOutput, decodeSrc);
});

function testValid(name: string, valid: boolean) {
  test(name, t => {
    const version = getContractVersion(t.context.validation, name);
    t.is(isUpgradeSafe(t.context.validation, version), valid);
  });
}

function testOverride(name: string, opts: ValidationOptions, valid: boolean) {
  const testName = name.concat(valid ? '_Allowed' : '_NotAllowed');
  test(testName, t => {
    const version = getContractVersion(t.context.validation, name);
    const assertUpgSafe = () => assertUpgradeSafe(t.context.validation, version, opts);
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
  const version = getContractVersion(t.context.validation, 'StorageInheritChild');
  const layout = getStorageLayout(t.context.validation, version);
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
