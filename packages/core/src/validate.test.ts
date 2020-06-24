import bre from '@nomiclabs/buidler';
import _test, { TestInterface } from 'ava';
import fs from 'fs';

import { validate, isUpgradeSafe, Validation } from './validate';

interface Context {
  validation: Validation;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const solcOutput = JSON.parse(fs.readFileSync('cache/solc-output.json', 'utf8'));
  t.context.validation = validate(solcOutput);
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
