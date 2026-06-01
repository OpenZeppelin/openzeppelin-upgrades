import BigNumber from 'bignumber.js';

const MAX_UINT256 = (1n << 256n) - 1n;

/**
 * Encodes a bigint as a 0x-prefixed, 64-char lowercase hex string — the canonical text encoding of
 * a `bytes32` value, used throughout this package for storage slots and similar 256-bit identifiers.
 * Throws if the value is outside the 0..2^256-1 range, since that almost certainly indicates a bug
 * upstream (overflow, wrong hash, etc.) and would silently produce a string longer than 64 chars.
 *
 * @param value bigint value to encode
 * @returns 0x-prefixed, 64-char lowercase hex string
 */
export function toBytes32Hex(value: bigint): string {
  if (value < 0n || value > MAX_UINT256) {
    throw new Error(`Value out of uint256 range: ${value}`);
  }
  return `0x${value.toString(16).padStart(64, '0')}`;
}

/**
 * Parses a Solidity unsigned integer literal source string (per
 * https://docs.soliditylang.org/en/latest/types.html#rational-literals) and returns it in the
 * canonical hex form produced by {@link toBytes32Hex}.
 *
 * Parsing is delegated to {@link BigNumber}, which accepts decimal (`1000`), hex (`0x1f`), and
 * scientific notation (`1e18`). Underscore separators and uppercase digits, which BigNumber rejects
 * but Solidity allows, are stripped/lowercased first. Non-integer results (e.g. `1.5e3`) are rejected.
 *
 * If the input is null or undefined, returns the canonical hex form of zero.
 *
 * Assumes the input is a valid uint256-compatible literal for Solidity, and only performs minimal validation.
 *
 * @param literal Integer literal source string to parse
 * @returns 0x-prefixed, 64-char lowercase hex string
 */
export function normalizeUint256Literal(literal: string | null | undefined): string {
  if (!literal) {
    return toBytes32Hex(0n);
  }
  const lowercaseNoUnderscores = literal.replace(/_/g, '').toLowerCase();

  const parsed = new BigNumber(lowercaseNoUnderscores);
  if (!parsed.isInteger()) {
    throw new Error(`Invalid integer literal: ${literal}`);
  }
  return toBytes32Hex(BigInt(parsed.toFixed()));
}
