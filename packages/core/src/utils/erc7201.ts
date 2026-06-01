import { keccak256 } from 'ethereumjs-util';

import { toBytes32Hex } from './integer-literals';

export const ERC7201_FORMULA_PREFIX = 'erc7201:';

/**
 * Returns the ERC-7201 storage location hash for a given namespace id using formula:
 * keccak256(abi.encode(uint256(keccak256(bytes(id))) - 1)) & ~bytes32(uint256(0xff))
 *
 * @param id The namespace id, not including the 'erc7201:' prefix
 * @returns The ERC-7201 storage location hash as a hex string
 */
export function calculateERC7201StorageLocation(id: string): string {
  const firstHash = keccak256(Buffer.from(id));
  const minusOne = BigInt(`0x${firstHash.toString('hex')}`) - 1n;
  // Pad to 64 hex chars so that `Buffer.from` doesn't silently truncate odd-length input;
  // `abi.encode(uint256)` is always 32 bytes.
  const minusOneBuffer = Buffer.from(minusOne.toString(16).padStart(64, '0'), 'hex');

  const secondHash = keccak256(minusOneBuffer);

  const mask = BigInt('0xff');
  const masked = BigInt(`0x${secondHash.toString('hex')}`) & ~mask;

  return toBytes32Hex(masked);
}
