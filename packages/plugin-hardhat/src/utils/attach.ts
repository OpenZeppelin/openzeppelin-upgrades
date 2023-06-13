import { Contract, ContractFactory } from 'ethers';

export function attach(contractFactory: ContractFactory, address: string) {
  return new Contract(address, contractFactory.interface.formatJson(), contractFactory.runner);
}
