import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';

import {
  validate,
  isUpgradeSafe,
  getStorageLayout,
  getContractVersion,
  Validation,
} from './validate';
import { solcInputOutputDecoder } from './src-decoder';

interface Context {
  validation: Validation;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcInput = JSON.parse(
    await fs.readFile('cache/solc-input.json', 'utf8'),
  );
  const solcOutput = JSON.parse(
    await fs.readFile('cache/solc-output.json', 'utf8'),
  );
  const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
  t.context.validation = validate(solcOutput, decodeSrc);
});

function testValid(name: string, valid: boolean) {
  test(name, t => {
    const version = getContractVersion(t.context.validation, name);
    t.is(isUpgradeSafe(t.context.validation, version), valid);
  });
}

testValid('HasEmptyConstructor', true);
testValid('HasConstantStateVariableAssignment', true);
testValid('HasStateVariable', true);

testValid('HasNonEmptyConstructor', false);
testValid('ParentHasNonEmptyConstructor', false);
testValid('AncestorHasNonEmptyConstructor', false);
testValid('HasStateVariableAssignment', false);
testValid('HasImmutableStateVariable', false);
testValid('HasSelfDestruct', false);
testValid('HasDelegateCall', false);
testValid('ImportedParentHasStateVariableAssignment', false);

test('inherited storage', t => {
  const version = getContractVersion(
    t.context.validation,
    'StorageInheritChild',
  );
  const layout = getStorageLayout(t.context.validation, version);
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});
