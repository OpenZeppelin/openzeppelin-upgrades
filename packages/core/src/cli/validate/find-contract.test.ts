import test from 'ava';

import { isMatch } from './find-contract';

test('fully qualified - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  t.true(isMatch('contracts/MyContract.sol:Foo', sourceContract as any));
});

test('fully qualified without folder - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'MyContract.sol:Foo',
  };

  t.true(isMatch('MyContract.sol:Foo', sourceContract as any));
});

test('short name - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  t.true(isMatch('Foo', sourceContract as any));
});

test('short name - match without folder', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'MyContract.sol:Foo',
  };

  t.true(isMatch('Foo', sourceContract as any));
});

test('short name with .sol - no match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  t.false(isMatch('MyContract.sol', sourceContract as any));
  t.false(isMatch('Foo.sol', sourceContract as any));
});

test('short name with .sol - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/Foo.sol:Foo',
  };

  t.true(isMatch('Foo.sol', sourceContract as any));
});

test('short name with .sol - match without folder', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'Foo.sol:Foo',
  };

  t.true(isMatch('Foo.sol', sourceContract as any));
});
