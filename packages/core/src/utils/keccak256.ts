import { keccak256 as nobleKeccak256 } from 'ethereum-cryptography/keccak';

/**
 * Computes the keccak256 hash of the input and returns it as a Node.js Buffer.
 *
 * Drop-in replacement for the `keccak256` previously imported from `ethereumjs-util`,
 * preserving the Buffer return type (and therefore the `.toString('hex', start, end)`
 * semantics) that callers rely on.
 */
export function keccak256(data: Uint8Array): Buffer {
  return Buffer.from(nobleKeccak256(data));
}
