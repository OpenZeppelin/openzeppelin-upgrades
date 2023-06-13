import { Contract, ContractFactory, ContractRunner, Signer } from 'ethers';

/**
 * Attaches a ContractFactory to an address and returns a Contract instance.
 */
export function attach(contractFactory: ContractFactory, address: string) {
  return new Contract(address, contractFactory.interface.formatJson(), contractFactory.runner);
}

/**
 * Best effort to get a signer from a ContractRunner. Returns undefined if the runner is not a signer.
 */
export function getSigner(runner?: null | ContractRunner): Signer | undefined {
  return runner && 'getAddress' in runner ? (runner as Signer) : undefined;
}
