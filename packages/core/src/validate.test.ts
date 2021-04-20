import _test, { TestInterface } from 'ava';
import { artifacts } from 'hardhat';

import {
  validate,
  isUpgradeSafe,
  getStorageLayout,
  getContractVersion,
  assertUpgradeSafe,
  ValidationOptions,
  RunValidation,
} from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validation: RunValidation;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  t.context.validation = await [
    'contracts/test/Validations.sol:HasEmptyConstructor',
    'contracts/test/ValidationsNatspec.sol:HasNonEmptyConstructorNatspec1',
  ].reduce(async (validation, contract) => {
    const buildInfo = await artifacts.getBuildInfo(contract);
    if (buildInfo === undefined) {
      throw new Error(`Build info not found for contract ${contract}`);
    }
    const solcOutput = buildInfo.output;
    const solcInput = buildInfo.input;
    const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
    return Object.assign(await validation, validate(solcOutput, decodeSrc));
  }, Promise.resolve({}));
});

let testCount = 0;

function testValid(name: string, valid: boolean) {
  test(`#${++testCount} ` + name, t => {
    const version = getContractVersion(t.context.validation, name);
    t.is(isUpgradeSafe([t.context.validation], version), valid);
  });
}

function testOverride(name: string, opts: ValidationOptions, valid: boolean) {
  const testName = name.concat(valid ? '_Allowed' : '_NotAllowed');
  test(`#${++testCount} ` + testName, t => {
    const version = getContractVersion(t.context.validation, name);
    const assertUpgSafe = () => assertUpgradeSafe([t.context.validation], version, opts);
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

test('inherited storage', t => {
  const version = getContractVersion(t.context.validation, 'StorageInheritChild');
  const layout = getStorageLayout([t.context.validation], version);
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});

testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllow: ['external-library-linking'] }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllow: ['external-library-linking'] }, true);

testValid('HasNonEmptyConstructorNatspec1', true);
testValid('HasNonEmptyConstructorNatspec2', true);
testValid('ParentHasNonEmptyConstructorNatspec1', true);
testValid('ParentHasNonEmptyConstructorNatspec2', true);
testValid('AncestorHasNonEmptyConstructorNatspec1', true);
testValid('AncestorHasNonEmptyConstructorNatspec2', true);
testValid('HasStateVariableAssignmentNatspec1', true);
testValid('HasStateVariableAssignmentNatspec2', true);
testValid('HasStateVariableAssignmentNatspec3', false);
testValid('HasImmutableStateVariableNatspec1', true);
testValid('HasImmutableStateVariableNatspec2', true);
testValid('HasImmutableStateVariableNatspec3', false);
testValid('HasSelfDestructNatspec1', true);
testValid('HasSelfDestructNatspec2', true);
testValid('HasSelfDestructNatspec3', true);
testValid('HasDelegateCallNatspec1', true);
testValid('HasDelegateCallNatspec2', true);
testValid('HasDelegateCallNatspec3', true);
testValid('ImportedParentHasStateVariableAssignmentNatspec1', true);
testValid('ImportedParentHasStateVariableAssignmentNatspec2', true);
testValid('UsesImplicitSafeInternalLibraryNatspec', true);
testValid('UsesImplicitSafeExternalLibraryNatspec', true);
testValid('UsesImplicitUnsafeInternalLibraryNatspec', true);
testValid('UsesImplicitUnsafeExternalLibraryNatspec', true);
testValid('UsesExplicitSafeInternalLibraryNatspec', true);
testValid('UsesExplicitSafeExternalLibraryNatspec', true);
testValid('UsesExplicitUnsafeInternalLibraryNatspec', true);
testValid('UsesExplicitUnsafeExternalLibraryNatspec', true);
