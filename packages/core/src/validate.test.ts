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
    'contracts/test/Proxiable.sol:ChildOfProxiable',
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

function testValidTransparent(name: string, valid: boolean) {
  testOverride(name, { unsafeAllow: ['no-public-upgrade-fn'] }, valid);
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

testValidTransparent('HasEmptyConstructor', true);
testValidTransparent('HasConstantStateVariableAssignment', true);
testValidTransparent('HasStateVariable', true);
testValidTransparent('UsesImplicitSafeInternalLibrary', true);
testValidTransparent('UsesExplicitSafeInternalLibrary', true);

testValidTransparent('HasNonEmptyConstructor', false);
testValidTransparent('ParentHasNonEmptyConstructor', false);
testValidTransparent('AncestorHasNonEmptyConstructor', false);
testValidTransparent('HasStateVariableAssignment', false);
testValidTransparent('HasImmutableStateVariable', false);
testValidTransparent('HasSelfDestruct', false);
testValidTransparent('HasDelegateCall', false);
testValidTransparent('ImportedParentHasStateVariableAssignment', false);
testValidTransparent('UsesImplicitUnsafeInternalLibrary', false);
testValidTransparent('UsesExplicitUnsafeInternalLibrary', false);
testValidTransparent('UsesImplicitUnsafeExternalLibrary', false);
testValidTransparent('UsesExplicitUnsafeExternalLibrary', false);

// Linked external libraries are not yet supported
// see: https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
testValidTransparent('UsesImplicitSafeExternalLibrary', false);
testValidTransparent('UsesExplicitSafeExternalLibrary', false);

test('inherited storage', t => {
  const version = getContractVersion(t.context.validation, 'StorageInheritChild');
  const layout = getStorageLayout([t.context.validation], version);
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});

testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, false);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllowLinkedLibraries: true }, false);
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllow: ['external-library-linking'] }, false);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllow: ['external-library-linking'] }, false);
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'], unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'], unsafeAllowLinkedLibraries: true }, true);
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn', 'external-library-linking'] }, true);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn', 'external-library-linking'] }, true);

testValid('HasEmptyConstructor', false);
testValid('HasInternalUpgradeToFunction', false);
testValid('HasUpgradeToFunction', true);
testValid('ParentHasUpgradeToFunction', true);
testValid('ChildOfProxiable', true);

testValidTransparent('HasNonEmptyConstructorNatspec1', true);
testValidTransparent('HasNonEmptyConstructorNatspec2', true);
testValidTransparent('ParentHasNonEmptyConstructorNatspec1', true);
testValidTransparent('ParentHasNonEmptyConstructorNatspec2', true);
testValidTransparent('AncestorHasNonEmptyConstructorNatspec1', true);
testValidTransparent('AncestorHasNonEmptyConstructorNatspec2', true);
testValidTransparent('HasStateVariableAssignmentNatspec1', true);
testValidTransparent('HasStateVariableAssignmentNatspec2', true);
testValidTransparent('HasStateVariableAssignmentNatspec3', false);
testValidTransparent('HasImmutableStateVariableNatspec1', true);
testValidTransparent('HasImmutableStateVariableNatspec2', true);
testValidTransparent('HasImmutableStateVariableNatspec3', false);
testValidTransparent('HasSelfDestructNatspec1', true);
testValidTransparent('HasSelfDestructNatspec2', true);
testValidTransparent('HasSelfDestructNatspec3', true);
testValidTransparent('HasDelegateCallNatspec1', true);
testValidTransparent('HasDelegateCallNatspec2', true);
testValidTransparent('HasDelegateCallNatspec3', true);
testValidTransparent('ImportedParentHasStateVariableAssignmentNatspec1', true);
testValidTransparent('ImportedParentHasStateVariableAssignmentNatspec2', true);
testValidTransparent('UsesImplicitSafeInternalLibraryNatspec', true);
testValidTransparent('UsesImplicitSafeExternalLibraryNatspec', true);
testValidTransparent('UsesImplicitUnsafeInternalLibraryNatspec', true);
testValidTransparent('UsesImplicitUnsafeExternalLibraryNatspec', true);
testValidTransparent('UsesExplicitSafeInternalLibraryNatspec', true);
testValidTransparent('UsesExplicitSafeExternalLibraryNatspec', true);
testValidTransparent('UsesExplicitUnsafeInternalLibraryNatspec', true);
testValidTransparent('UsesExplicitUnsafeExternalLibraryNatspec', true);
