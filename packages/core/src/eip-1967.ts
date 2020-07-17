import { toChecksumAddress, keccak256 } from 'ethereumjs-util';
import BN from 'bn.js';

import { EthereumProvider, getStorageAt } from './provider';

export async function getAdminAddress(provider: EthereumProvider, address: string): Promise<string> {
  const ADMIN_LABEL = 'eip1967.proxy.admin';
  const FALLBACK_ADMIN_LABEL = 'org.zeppelinos.proxy.admin';
  const storage = await getEip1967Storage(provider, address, ADMIN_LABEL, FALLBACK_ADMIN_LABEL);

  return toChecksumAddress(storage);
}

export async function getImplementationAddress(provider: EthereumProvider, address: string): Promise<string> {
  const IMPLEMENTATION_LABEL = 'eip1967.proxy.implementation';
  const FALLBACK_IMPLEMENTATION_LABEL = 'org.zeppelinos.proxy.implementation';
  const storage = await getEip1967Storage(provider, address, IMPLEMENTATION_LABEL, FALLBACK_IMPLEMENTATION_LABEL);

  return toChecksumAddress(storage);
}

async function getEip1967Storage(provider: EthereumProvider, address: string, slot: string, fallbackSlot: string): Promise<string> {
  let storage = await getStorageAt(provider, address, toEip1967Hash(slot));

  if (isEmptySlot(storage)) {  
    storage = await getStorageAt(provider, address, toFallbackEip1967Hash(fallbackSlot));
  }

  if (isEmptySlot(storage)) {  
    throw new Error(`Could not find "${slot}" nor "${fallbackSlot}" slots in proxy storage`);
  }

  return storage;
}

export function toFallbackEip1967Hash(label: string): string {
  return `0x${keccak256(Buffer.from(label))}`;
}

export function toEip1967Hash(label: string): string {
  const hash = keccak256(Buffer.from(label));
  const bigNumber = new BN(hash, 'hex').sub(new BN(1));
  return `0x${bigNumber.toString(16)}`;
}

function isEmptySlot(storage: string): boolean {
  if (storage.slice(0, 2) === '0x') {
    // remove 0x if present
    storage = storage.slice(2);
  }

  return new BN(storage, 'hex').isZero();
}
