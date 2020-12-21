import test from 'ava';

import { levenshtein } from './levenshtein';

const match = <T>(a: T, b: T) => ({ isEqual: () => a === b });

test('equal', t => {
  const a = [...'abc'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, []);
});

test('append', t => {
  const a = [...'abc'];
  const b = [...'abcd'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, [
    {
      kind: 'append',
      updated: 'd',
    },
  ]);
});

test('delete from end', t => {
  const a = [...'abcd'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, [
    {
      kind: 'delete',
      original: 'd',
    },
  ]);
});

test('delete from middle', t => {
  const a = [...'abc'];
  const b = [...'ac'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, [
    {
      kind: 'delete',
      original: 'b',
    },
  ]);
});

test('insert', t => {
  const a = [...'abc'];
  const b = [...'azbc'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, [
    {
      kind: 'insert',
      updated: 'z',
    },
  ]);
});
