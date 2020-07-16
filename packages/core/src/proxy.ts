import { EthereumProvider, getStorageAt } from './provider';
import { toEip1967Hash, toDeprecatedEip1967Hash, toChecksumAddress } from './crypto';


export async function getAdminAddress(provider: EthereumProvider, address: string): Promise<string> {
  const ADMIN_LABEL = 'eip1967.proxy.admin';
  const DEPRECATED_ADMIN_LABEL = 'org.zeppelinos.proxy.admin';
  const storage = await getEip1967Storage(provider, address, ADMIN_LABEL, DEPRECATED_ADMIN_LABEL);

  return toChecksumAddress(storage);
}

export async function getImplementationAddress(provider: EthereumProvider, address: string): Promise<string> {
  const IMPLEMENTATION_LABEL = 'eip1967.proxy.implementation';
  const DEPRECATED_IMPLEMENTATION_LABEL = 'org.zeppelinos.proxy.implementation';
  const storage = await getEip1967Storage(provider, address, IMPLEMENTATION_LABEL, DEPRECATED_IMPLEMENTATION_LABEL);

  return toChecksumAddress(storage);
}

async function getEip1967Storage(provider: EthereumProvider, address: string, newSlot: string, deprecatedSlot: string): Promise<string> {
  let storage = await getStorageAt(provider, address, toEip1967Hash(newSlot));

  if (storage === '0x0') {  
    storage = await getStorageAt(provider, address, toDeprecatedEip1967Hash(deprecatedSlot));
  }

  return storage;
}
