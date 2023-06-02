import test from 'ava';
import { ReferenceContractNotFound } from './upgradeability-assessment';

test('reference contract not found', async t => {
  const e = t.throws(() => {
    throw new ReferenceContractNotFound('REFERENCE', 'ORIGIN');
  });
  t.is(e?.message, 'Could not find contract REFERENCE referenced in ORIGIN.');
});
