import test from 'ava';

import { levenshtein } from './levenshtein';

const match = <T>(a: T, b: T) => ({ isEqual: () => a === b });

test('equal', t => {
  const a = [...'abc'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, match);
  t.deepEqual(ops, []);
});

test('appended', t => {
  const a = [...'abc'];
  const b = [...'abcd'];
  const ops = levenshtein(a, b, match);
  t.like(ops, {
    length: 1,
    0: {
      kind: 'appended',
      updated: 'd',
    },
  });
});

test('delete from end', t => {
  const a = [...'abcd'];
  const b = [...'abc'];
  const ops = levenshtein(a, b, match);
  t.like(ops, {
    length: 1,
    0: {
      kind: 'deleted',
      original: 'd',
    },
  });
});

test('delete from middle', t => {
  const a = [...'abc'];
  const b = [...'ac'];
  const ops = levenshtein(a, b, match);
  t.like(ops, {
    length: 1,
    0: {
      kind: 'deleted',
      original: 'b',
    },
  });
});

test('inserted', t => {
  const a = [...'abc'];
  const b = [...'azbc'];
  const ops = levenshtein(a, b, match);
  t.like(ops, {
    length: 1,
    0: {
      kind: 'inserted',
      updated: 'z',
    },
  });
});
