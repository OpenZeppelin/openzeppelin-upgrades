import test from 'ava';

import { calculateERC7201StorageLocation } from './erc7201';

test('calculateERC7201StorageLocation', t => {
  t.is(
    calculateERC7201StorageLocation('example.main'),
    '0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500',
  );
});
