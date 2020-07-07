import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';

import { validate, isUpgradeSafe, getStorageLayout, Validation } from './validate';

interface Context {
  validation: Validation;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcInput = JSON.parse(await fs.readFile('cache/solc-input.json', 'utf8'));
  const solcOutput = JSON.parse(await fs.readFile('cache/solc-output.json', 'utf8'));
  t.context.validation = validate(solcOutput, solcInput);
});

function testValid(name: string, valid: boolean) {
  test(name, t => {
    t.is(isUpgradeSafe(t.context.validation, name), valid);
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
  const layout = getStorageLayout(t.context.validation, 'StorageInheritChild');
  t.is(layout.storage.length, 8);
  for (let i = 0; i < layout.storage.length; i++) {
    t.is(layout.storage[i].label, `v${i}`);
    t.truthy(layout.types[layout.storage[i].type]);
  }
});
