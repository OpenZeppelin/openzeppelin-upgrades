import test from 'ava';

import { levenshtein } from './levenshtein';

test('equal', t => {
  const a = [...'abc'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, (a, b) => (a === b ? 'equal' : 'different'));
  t.deepEqual(ops, []);
});

test('append', t => {
  const a = [...'abc'];
  const b = [...'abcd'];
  const ops = levenshtein(a, b, (a, b) => (a === b ? 'equal' : 'different'));
  t.deepEqual(ops, [
    {
      action: 'append',
      updated: 'd',
    },
  ]);
});

test('pop', t => {
  const a = [...'abcd'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, (a, b) => (a === b ? 'equal' : 'different'));
  t.deepEqual(ops, [
    {
      action: 'pop',
      original: 'd',
    },
  ]);
});

test('delete', t => {
  const a = [...'abc'];
  const b = [...'ac'];
  const ops = levenshtein(a, b, (a, b) => (a === b ? 'equal' : 'different'));
  t.deepEqual(ops, [
    {
      action: 'delete',
      original: 'b',
    },
  ]);
});

test('insert', t => {
  const a = [...'abc'];
  const b = [...'azbc'];
  const ops = levenshtein(a, b, (a, b) => (a === b ? 'equal' : 'different'));
  t.deepEqual(ops, [
    {
      action: 'insert',
      updated: 'z',
    },
  ]);
});
