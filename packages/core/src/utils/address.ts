import { keccak256 } from './keccak256';

/**
 * Converts an address to its EIP-55 checksummed representation.
 *
 * Replaces `toChecksumAddress` previously imported from `ethereumjs-util`. Unlike that
 * implementation, this intentionally omits input hex-string validation and the optional
 * EIP-1191 chain id: the only caller (`parseAddress` below) always passes a well-formed
 * `0x`-prefixed 20-byte address and never needs chain-specific checksums. Output matches
 * the standard EIP-55 algorithm byte-for-byte.
 *
 * @param address A hex address string (with or without the `0x` prefix).
 * @returns The EIP-55 checksummed address.
 */
function toChecksumAddress(address: string): string {
  const lowerCase = address.toLowerCase().replace(/^0x/, '');
  const hash = keccak256(Buffer.from(lowerCase, 'utf8')).toString('hex');
  let checksummed = '0x';
  for (let i = 0; i < lowerCase.length; i++) {
    checksummed += parseInt(hash[i], 16) >= 8 ? lowerCase[i].toUpperCase() : lowerCase[i];
  }
  return checksummed;
}

/**
 * Parses an address from a hex string which may come from storage or a returned address via eth_call.
 *
 * @param addressString The address hex string.
 * @returns The parsed checksum address, or undefined if the input string is not an address.
 */
export function parseAddress(addressString: string): string | undefined {
  const buf = Buffer.from(addressString.replace(/^0x/, ''), 'hex');
  if (!buf.slice(0, 12).equals(Buffer.alloc(12, 0)) || buf.length !== 32) {
    return undefined;
  }
  const address = '0x' + buf.toString('hex', 12, 32); // grab the last 20 bytes
  return toChecksumAddress(address);
}
