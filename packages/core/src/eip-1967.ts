import { toChecksumAddress, keccak256 } from 'ethereumjs-util';
import BN from 'bn.js';

import { EthereumProvider, getStorageAt } from './provider';

export async function getAdminAddress(provider: EthereumProvider, address: string): Promise<string> {
  const ADMIN_LABEL = 'eip1967.proxy.admin';
  const FALLBACK_ADMIN_LABEL = 'org.zeppelinos.proxy.admin';
  const storage = await getEip1967Storage(provider, address, ADMIN_LABEL, FALLBACK_ADMIN_LABEL);

  return parseAddress(storage);
}

export async function getImplementationAddress(provider: EthereumProvider, address: string): Promise<string> {
  const IMPLEMENTATION_LABEL = 'eip1967.proxy.implementation';
  const FALLBACK_IMPLEMENTATION_LABEL = 'org.zeppelinos.proxy.implementation';
  const storage = await getEip1967Storage(provider, address, IMPLEMENTATION_LABEL, FALLBACK_IMPLEMENTATION_LABEL);

  if (isEmptySlot(storage)) {
    throw new Error(`Contract at ${address} doesn't look like an EIP 1967 proxy`);
  }

  return parseAddress(storage);
}

async function getEip1967Storage(
  provider: EthereumProvider,
  address: string,
  slot: string,
  fallbackSlot: string,
): Promise<string> {
  let storage = await getStorageAt(provider, address, toEip1967Hash(slot));

  if (isEmptySlot(storage)) {
    storage = await getStorageAt(provider, address, toFallbackEip1967Hash(fallbackSlot));
  }

  return storage;
}

export function toFallbackEip1967Hash(label: string): string {
  return '0x' + keccak256(Buffer.from(label)).toString('hex');
}

export function toEip1967Hash(label: string): string {
  const hash = keccak256(Buffer.from(label));
  const bigNumber = new BN(hash).sub(new BN(1));
  return '0x' + bigNumber.toString(16);
}

function isEmptySlot(storage: string): boolean {
  storage = storage.replace(/^0x/, '');
  return new BN(storage, 'hex').isZero();
}

function parseAddress(storage: string): string {
  const buf = Buffer.from(storage.replace(/^0x/, ''), 'hex');
  if (!buf.slice(0, 12).equals(Buffer.alloc(12, 0))) {
    throw new Error(`Value in storage is not an address (${storage})`);
  }
  const address = '0x' + buf.toString('hex', 12, 32); // grab the last 20 bytes
  return toChecksumAddress(address);
}
