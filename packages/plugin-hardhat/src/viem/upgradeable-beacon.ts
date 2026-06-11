import type { NetworkConnection } from 'hardhat/types/network';
import type { GetContractReturnType, KeyedClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

/**
 * ABI of the UpgradeableBeacon contract from OpenZeppelin Contracts 5.x, which is the beacon
 * that `deployBeacon` deploys. Exposed as a `const` so that the beacon contract instances
 * returned by the viem-based API have typed `read` and `write` functions.
 */
export const upgradeableBeaconAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'implementation_', type: 'address' },
      { internalType: 'address', name: 'initialOwner', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'address', name: 'implementation', type: 'address' }],
    name: 'BeaconInvalidImplementation',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'implementation', type: 'address' }],
    name: 'Upgraded',
    type: 'event',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newImplementation', type: 'address' }],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * A viem contract instance for an UpgradeableBeacon contract.
 */
export type UpgradeableBeaconContract = GetContractReturnType<typeof upgradeableBeaconAbi>;

/**
 * Gets a viem contract instance for the UpgradeableBeacon at the given address.
 * The beacon contract is not a project artifact, so the instance is created directly with
 * viem's `getContract` instead of `connection.viem.getContractAt`, using the same clients
 * that hardhat-viem would use by default.
 */
export async function getUpgradeableBeaconContract(
  connection: NetworkConnection,
  address: Address,
  client?: KeyedClient,
): Promise<UpgradeableBeaconContract> {
  const { getContract } = await import('viem');
  const publicClient = client?.public ?? (await connection.viem.getPublicClient());
  const walletClient = client?.wallet ?? (await connection.viem.getWalletClients())[0];
  return getContract({
    address,
    abi: upgradeableBeaconAbi,
    client: { public: publicClient, wallet: walletClient },
  });
}
