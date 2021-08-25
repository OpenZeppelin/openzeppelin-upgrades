import { toChecksumAddress, keccak256 } from 'ethereumjs-util';
import BN from 'bn.js';

import { EthereumProvider, getStorageAt } from './provider';

export async function getAdminAddress(provider: EthereumProvider, address: string): Promise<string> {
  const storage = await getStorageFallback(
    provider,
    address,
    toEip1967Hash('eip1967.proxy.admin'),
    toFallbackEip1967Hash('org.zeppelinos.proxy.admin'),
  );

  return parseAddress(storage);
}

export async function getImplementationAddress(provider: EthereumProvider, address: string): Promise<string> {
  const storage = await getStorageFallback(
    provider,
    address,
    toEip1967Hash('eip1967.proxy.implementation'),
    toFallbackEip1967Hash('org.zeppelinos.proxy.implementation'),
  );

  if (isEmptySlot(storage)) {
    throw new Error(`Contract at ${address} doesn't look like an administered ERC 1967 proxy`);
  }

  return parseAddress(storage);
}

export async function getBeaconAddress(provider: EthereumProvider, address: string): Promise<string> {
  const storage = await getStorageFallback(provider, address, toEip1967Hash('eip1967.proxy.beacon'));

  if (isEmptySlot(storage)) {
    throw new Error(`Contract at ${address} doesn't look like an ERC 1967 beacon proxy`);
  }

  return parseAddress(storage);
}

async function getStorageFallback(provider: EthereumProvider, address: string, ...slots: string[]): Promise<string> {
  let storage = '0x0000000000000000000000000000000000000000000000000000000000000000'; // default: empty slot

  for (const slot of slots) {
    storage = await getStorageAt(provider, address, slot);
    if (!isEmptySlot(storage)) {
      break;
    }
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
