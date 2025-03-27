import test from 'ava';

import { integerLiteralTo64ByteHexString } from './integer-literals';

const ZEROES = '0x0000000000000000000000000000000000000000000000000000000000000000';

test('falsy', t => {
  t.is(integerLiteralTo64ByteHexString(undefined), ZEROES);
  t.is(integerLiteralTo64ByteHexString(null), ZEROES);
  t.is(integerLiteralTo64ByteHexString(''), ZEROES);
});

test('hex', t => {
  t.is(integerLiteralTo64ByteHexString('0x12e3'), '0x00000000000000000000000000000000000000000000000000000000000012e3');
});

test('hex - leading zeroes', t => {
  t.is(
    integerLiteralTo64ByteHexString('0x0012e3'),
    '0x00000000000000000000000000000000000000000000000000000000000012e3',
  );
});

test('hex - capital', t => {
  t.is(integerLiteralTo64ByteHexString('0x12E3'), '0x00000000000000000000000000000000000000000000000000000000000012e3');
});

test('decimal', t => {
  t.is(integerLiteralTo64ByteHexString('1234'), '0x00000000000000000000000000000000000000000000000000000000000004d2');
});

test('zeroes', t => {
  t.is(integerLiteralTo64ByteHexString('0'), ZEROES);
  t.is(integerLiteralTo64ByteHexString('0x000'), ZEROES);
  t.is(integerLiteralTo64ByteHexString(ZEROES), ZEROES);
});

test('underscores', t => {
  t.is(integerLiteralTo64ByteHexString('1_23_4'), '0x00000000000000000000000000000000000000000000000000000000000004d2');
});

test('scientific notation', t => {
  t.is(integerLiteralTo64ByteHexString('20e10'), '0x0000000000000000000000000000000000000000000000000000002e90edd000');
});

test('scientific notation - capital', t => {
  t.is(integerLiteralTo64ByteHexString('20E10'), '0x0000000000000000000000000000000000000000000000000000002e90edd000');
});

test('full hex', t => {
  t.is(
    integerLiteralTo64ByteHexString('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  );
});

test('full hex with leading and trailing zeroes', t => {
  t.is(
    integerLiteralTo64ByteHexString('0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00'),
    '0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00',
  );
});
