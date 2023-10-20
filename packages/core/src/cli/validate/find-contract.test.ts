import test from 'ava';

import { findContract } from './find-contract';

test('fully qualified - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  t.deepEqual(findContract('MyContract.sol:Foo', sourceContract, [sourceContract]), sourceContract);
});

test('fully qualified without folder - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'MyContract.sol:Foo',
  };

  t.deepEqual(findContract('MyContract.sol:Foo', sourceContract, [sourceContract]), sourceContract);
});

test('short name - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  t.deepEqual(findContract('Foo', sourceContract, [sourceContract]), sourceContract);
});

test('short name - match without folder', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'MyContract.sol:Foo',
  };

  t.deepEqual(findContract('Foo', sourceContract, [sourceContract]), sourceContract);
});

test('short name with .sol - no match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/MyContract.sol:Foo',
  };

  for (const name of ['MyContract.sol', 'Foo.sol']) {
    const error = t.throws(() => findContract(name, sourceContract, [sourceContract]));
    t.assert(
      error?.message.includes(`Could not find contract ${name} referenced in ${sourceContract.fullyQualifiedName}`),
      error?.message,
    );
  }
});

test('short name with .sol - match', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'contracts/Foo.sol:Foo',
  };

  t.deepEqual(findContract('Foo.sol', sourceContract, [sourceContract]), sourceContract);
});

test('short name with .sol - match without folder', async t => {
  const sourceContract = {
    name: 'Foo',
    fullyQualifiedName: 'Foo.sol:Foo',
  };

  t.deepEqual(findContract('Foo.sol', sourceContract, [sourceContract]), sourceContract);
});
