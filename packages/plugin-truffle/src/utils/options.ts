import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export interface Options extends ValidationOptions {
  deployer?: Deployer;
}

export function withDefaults(opts: Options): Required<Options> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    ...withValidationDefaults(opts),
  };
}

const defaultDeployer: Deployer = {
  get provider() {
    return getTruffleConfig().provider;
  },
  async deploy(Contract: ContractClass, ...args: unknown[]): Promise<ContractInstance> {
    return Contract.new(...args);
  },
};
