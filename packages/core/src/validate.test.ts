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
    'contracts/test/ValidationsNatspec.sol:HasEmptyConstructorNatspec',
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

function testValid(name: string, valid: boolean) {
  test(name, t => {
    const version = getContractVersion(t.context.validation, name);
    t.is(isUpgradeSafe([t.context.validation], version), valid);
  });
}

function testOverride(name: string, opts: ValidationOptions, valid: boolean) {
  const testName = name.concat(valid ? '_Allowed' : '_NotAllowed');
  test(testName, t => {
    const version = getContractVersion(t.context.validation, name);
    const assertUpgSafe = () => assertUpgradeSafe([t.context.validation], version, opts);
    if (valid) {
      t.notThrows(assertUpgSafe);
    } else {
      t.throws(assertUpgSafe);
    }
  });
}

testOverride('HasEmptyConstructor', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasConstantStateVariableAssignment', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasStateVariable', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesImplicitSafeInternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesExplicitSafeInternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, true);

testOverride('HasNonEmptyConstructor', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('ParentHasNonEmptyConstructor', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('AncestorHasNonEmptyConstructor', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('HasStateVariableAssignment', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('HasImmutableStateVariable', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('HasSelfDestruct', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('HasDelegateCall', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('ImportedParentHasStateVariableAssignment', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('UsesImplicitUnsafeInternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('UsesExplicitUnsafeInternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('UsesImplicitUnsafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('UsesExplicitUnsafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);

// Linked external libraries are not yet supported
// see: https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
testOverride('UsesImplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);
testOverride('UsesExplicitSafeExternalLibrary', { unsafeAllow: ['no-public-upgrade-fn'] }, false);

test('inherited storage', t => {
  const version = getContractVersion(t.context.validation, 'StorageInheritChild');
  const layout = getStorageLayout([t.context.validation], version);
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});

testOverride(
  'UsesImplicitSafeExternalLibrary',
  { unsafeAllow: ['external-library-linking', 'no-public-upgrade-fn'] },
  true,
);
testOverride(
  'UsesExplicitSafeExternalLibrary',
  { unsafeAllow: ['external-library-linking', 'no-public-upgrade-fn'] },
  true,
);

testValid('HasEmptyConstructor', false);
testValid('HasInternalUpgrateToFunction', false);
testValid('HasUpgrateToFunction', true);
testValid('ParentHasUpgrateToFunction', true);

testOverride('HasNonEmptyConstructorNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasNonEmptyConstructorNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('ParentHasNonEmptyConstructorNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('ParentHasNonEmptyConstructorNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('AncestorHasNonEmptyConstructorNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('AncestorHasNonEmptyConstructorNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasStateVariableAssignmentNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasStateVariableAssignmentNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasImmutableStateVariableNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasImmutableStateVariableNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasSelfDestructNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasSelfDestructNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasSelfDestructNatspec3', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasDelegateCallNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasDelegateCallNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('HasDelegateCallNatspec3', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('ImportedParentHasStateVariableAssignmentNatspec1', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('ImportedParentHasStateVariableAssignmentNatspec2', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesImplicitSafeInternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesImplicitSafeExternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesImplicitUnsafeInternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesImplicitUnsafeExternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesExplicitSafeInternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesExplicitSafeExternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesExplicitUnsafeInternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);
testOverride('UsesExplicitUnsafeExternalLibraryNatspec', { unsafeAllow: ['no-public-upgrade-fn'] }, true);

testValid('ChildOfProxiable', true);
