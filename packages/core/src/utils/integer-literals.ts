/**
 * Converts a Solidity integer literal according to https://docs.soliditylang.org/en/latest/types.html#rational-literals
 * to a 64-byte padded hex string.
 *
 * If the input is null or undefined, returns '0x0000000000000000000000000000000000000000000000000000000000000000'.
 *
 * Assumes the input is a valid integer literal for Solidity, and does not perform any validation.
 *
 * @param literal Integer literal to convert
 * @returns Hex string with 0x prefix, padded to 64 bytes with leading zeroes
 */
export function integerLiteralTo64ByteHexString(literal: string | null | undefined): string {
  if (!literal) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  const lowercaseNoUnderscores = literal.replace(/_/g, '').toLowerCase();

  const isHex = lowercaseNoUnderscores.startsWith('0x');
  const isScientific = !isHex && lowercaseNoUnderscores.includes('e');

  let calculatedValue: bigint;
  if (isScientific) {
    const [base, exponent] = lowercaseNoUnderscores.split('e');
    calculatedValue = BigInt(base) * BigInt(10) ** BigInt(exponent);
  } else {
    // works for hex and decimal
    calculatedValue = BigInt(lowercaseNoUnderscores);
  }

  const calculatedHex = calculatedValue.toString(16);
  const padded = calculatedHex.padStart(64, '0');
  return `0x${padded}`;
}
