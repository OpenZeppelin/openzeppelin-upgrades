import BN from 'bn.js'
import keccak from 'keccak'

import { EthereumProvider, getStorageAt } from './provider';

// Implementation storage
const IMPLEMENTATION_LABEL = 'eip1967.proxy.implementation';
const DEPRECATED_IMPLEMENTATION_LABEL = 'org.zeppelinos.proxy.implementation';
const IMPLEMENTATION_LABEL_HASH = toEip1967Hash(IMPLEMENTATION_LABEL);
const DEPRECATED_IMPLEMENTATION_LABEL_ID = toKeccak(DEPRECATED_IMPLEMENTATION_LABEL);

// ProxyAdmin storage
const ADMIN_LABEL = 'eip1967.proxy.admin';
const DEPRECATED_ADMIN_LABEL = 'org.zeppelinos.proxy.admin';
const ADMIN_LABEL_HASH = toEip1967Hash(ADMIN_LABEL);
const DEPRECATED_ADMIN_LABEL_ID = toKeccak(DEPRECATED_ADMIN_LABEL);

export async function getAdminAddress(provider: EthereumProvider, address: string): Promise<string> {
  return await backwardsCompatileGetStorageAt(provider, address, ADMIN_LABEL_HASH, DEPRECATED_ADMIN_LABEL_ID);
}

export async function getImplementationAddress(provider: EthereumProvider, address: string): Promise<string> {
  return await backwardsCompatileGetStorageAt(provider, address, IMPLEMENTATION_LABEL_HASH, DEPRECATED_IMPLEMENTATION_LABEL_ID);
}

async function backwardsCompatileGetStorageAt(provider: EthereumProvider, address: string, newSlot: string, deprecatedSlot: string): Promise<string> {
  let storage = await getStorageAt(provider, address, newSlot);

  if (storage === '0x0') {  
    storage = await getStorageAt(provider, address, deprecatedSlot);
  }

  return storage;
}

// utils
function toKeccak(s: string): string {
  return keccak('keccak256').update(s).digest('hex');
}

function toEip1967Hash(label: string): string {
  const hash = toKeccak(label);
  const bigNumber = new BN(hash, 'hex').sub(new BN(1));
  return bigNumber.toString(16);
}
