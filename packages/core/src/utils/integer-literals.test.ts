import test from 'ava';

import { normalizeUint256Literal } from './integer-literals';

const ZEROES = '0x0000000000000000000000000000000000000000000000000000000000000000';

test('falsy', t => {
  t.is(normalizeUint256Literal(undefined), ZEROES);
  t.is(normalizeUint256Literal(null), ZEROES);
  t.is(normalizeUint256Literal(''), ZEROES);
});

test('hex', t => {
  t.is(normalizeUint256Literal('0x12e3'), '0x00000000000000000000000000000000000000000000000000000000000012e3');
});

test('hex - leading zeroes', t => {
  t.is(normalizeUint256Literal('0x0012e3'), '0x00000000000000000000000000000000000000000000000000000000000012e3');
});

test('hex - capital', t => {
  t.is(normalizeUint256Literal('0x12E3'), '0x00000000000000000000000000000000000000000000000000000000000012e3');
});

test('decimal', t => {
  t.is(normalizeUint256Literal('1234'), '0x00000000000000000000000000000000000000000000000000000000000004d2');
});

test('zeroes', t => {
  t.is(normalizeUint256Literal('0'), ZEROES);
  t.is(normalizeUint256Literal('0x000'), ZEROES);
  t.is(normalizeUint256Literal(ZEROES), ZEROES);
  t.is(normalizeUint256Literal('-0'), ZEROES);
});

test('underscores', t => {
  t.is(normalizeUint256Literal('1_23_4'), '0x00000000000000000000000000000000000000000000000000000000000004d2');
});

test('scientific notation', t => {
  t.is(normalizeUint256Literal('20e10'), '0x0000000000000000000000000000000000000000000000000000002e90edd000');
});

test('scientific notation - capital', t => {
  t.is(normalizeUint256Literal('20E10'), '0x0000000000000000000000000000000000000000000000000000002e90edd000');
});

test('scientific notation - fractional base', t => {
  t.is(normalizeUint256Literal('2.5e3'), '0x00000000000000000000000000000000000000000000000000000000000009c4');
});

test('scientific notation - negative exponent', t => {
  t.is(normalizeUint256Literal('250000e-2'), '0x00000000000000000000000000000000000000000000000000000000000009c4');
});

test('scientific notation - invalid integer literal', t => {
  const error = t.throws(() => normalizeUint256Literal('2e-3'));
  t.is(error?.message, 'Invalid integer literal: 2e-3');
});

test('full hex', t => {
  t.is(
    normalizeUint256Literal('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  );
});

test('full hex with leading and trailing zeroes', t => {
  t.is(
    normalizeUint256Literal('0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00'),
    '0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00',
  );
});
