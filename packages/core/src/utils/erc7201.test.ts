import test from 'ava';

import { calculateERC7201StorageLocation } from './erc7201';

test('calculateERC7201StorageLocation', t => {
  t.is(
    calculateERC7201StorageLocation('example.main'),
    '0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500',
  );
});

// `keccak256("ns2") - 1` is 63 hex chars (odd-length), which must be zero-padded to 32 bytes
// before hashing. Regression test for truncation of the intermediate buffer.
test('calculateERC7201StorageLocation - odd-length intermediate hash', t => {
  t.is(calculateERC7201StorageLocation('ns2'), '0xa61069020885c09e922542fb3fa98c8d50e6481fc1251ff86c3319a70f0f7d00');
});
