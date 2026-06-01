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

// Known published OpenZeppelin Contracts storage locations.
test('calculateERC7201StorageLocation - published constants', t => {
  t.is(
    calculateERC7201StorageLocation('openzeppelin.storage.Initializable'),
    '0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00',
  );
  t.is(
    calculateERC7201StorageLocation('openzeppelin.storage.Ownable'),
    '0x9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300',
  );
});
