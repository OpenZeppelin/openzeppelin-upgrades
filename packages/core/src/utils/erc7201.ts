import { keccak256 } from 'ethereumjs-util';

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
  const minusOneBuffer = Buffer.from(minusOne.toString(16), 'hex');

  const secondHash = keccak256(minusOneBuffer);

  const mask = BigInt('0xff');
  const masked = BigInt(`0x${secondHash.toString('hex')}`) & ~mask;

  const padded = masked.toString(16).padStart(64, '0');

  return `0x${padded}`;
}
