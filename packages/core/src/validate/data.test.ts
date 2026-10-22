import test from 'ava';

import { concatRunData, isCurrentValidationData, normalizeValidationData } from './data';

test('validations cache from the previous version is outdated', t => {
  // Struct member annotations are included in layouts since version 3.5, so caches written by earlier versions must be regenerated
  const previous = { version: '3.4' as const, log: [] };
  t.false(isCurrentValidationData(previous));
  const current: string = concatRunData({}).version;
  t.is(current, '3.5');

  // Data from the same major version can still be read
  t.is(normalizeValidationData(previous), previous);
});
