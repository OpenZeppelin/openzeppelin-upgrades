import BN from 'bn.js';
import keccak from 'keccak';

export function toKeccak(s: string): string {
  return keccak('keccak256').update(s).digest('hex');
}

export function toDeprecatedEip1967Hash(label: string): string {
  return `0x${toKeccak(label)}`;
}

export function toEip1967Hash(label: string): string {
  const hash = toKeccak(label);
  const bigNumber = new BN(hash, 'hex').sub(new BN(1));
  return `0x${bigNumber.toString(16)}`;
}

export function toChecksumAddress(address: string): string {
  address = address.toLowerCase().replace('0x', '');
  const hash = toKeccak(address);
  let ret = '0x';

  for (let i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase();
    } else {
      ret += address[i];
    }
  }

  return ret;
}
