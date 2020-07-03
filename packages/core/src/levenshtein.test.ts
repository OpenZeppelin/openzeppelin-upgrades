import test from 'ava';

import { levenshtein } from './levenshtein';

test('equal', t => {
  const a = [..."abc"];
  const b = [..."abc"];
  const ops = levenshtein(a, b, (a, b) => a === b ? 'equal' : 'different');
  t.deepEqual(ops, []);
});

test('append', t => {
  const a = [..."abc"];
  const b = [..."abcd"];
  const ops = levenshtein(a, b, (a, b) => a === b ? 'equal' : 'different');
  t.deepEqual(ops, [{
    action: 'append',
    updated: {
      element: 'd',
      index: 3,
    },
  }]);
});

test('pop', t => {
  const a = [..."abcd"];
  const b = [..."abc"];
  const ops = levenshtein(a, b, (a, b) => a === b ? 'equal' : 'different');
  t.deepEqual(ops, [{
    action: 'pop',
    original: {
      element: 'd',
      index: 3,
    },
  }]);
});

test('delete', t => {
  const a = [..."abc"];
  const b = [..."ac"];
  const ops = levenshtein(a, b, (a, b) => a === b ? 'equal' : 'different');
  t.deepEqual(ops, [{
    action: 'delete',
    original: {
      element: 'b',
      index: 1,
    },
  }]);
});

test('insert', t => {
  const a = [..."abc"];
  const b = [..."azbc"];
  const ops = levenshtein(a, b, (a, b) => a === b ? 'equal' : 'different');
  t.deepEqual(ops, [{
    action: 'insert',
    updated: {
      element: 'z',
      index: 1,
    },
  }]);
});
