import BigNumber from 'bignumber.js';

/**
 * Converts a Solidity unsigned integer literal according to https://docs.soliditylang.org/en/latest/types.html#rational-literals
 * to a 64-byte padded hex string.
 *
 * Accepts decimal, hexadecimal, and scientific notation formats.
 *
 * If the input is null or undefined, returns '0x0000000000000000000000000000000000000000000000000000000000000000'.
 *
 * Assumes the input is a valid uint256-compatible literal for Solidity, and only performs minimal validation.
 *
 * @param literal Integer literal to convert
 * @returns Hex string with 0x prefix, padded to 64 bytes with leading zeroes
 */
export function normalizeUint256Literal(literal: string | null | undefined): string {
  if (!literal) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  const lowercaseNoUnderscores = literal.replace(/_/g, '').toLowerCase();

  const parsed = new BigNumber(lowercaseNoUnderscores);
  if (!parsed.isInteger()) {
    throw new Error(`Invalid integer literal: ${literal}`);
  }
  const calculatedValueAsHex = parsed.toString(16);
  const padded = calculatedValueAsHex.padStart(64, '0');
  return `0x${padded}`;
}
