import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export interface Options extends ValidationOptions {
  deployer?: Deployer;
  constructorArgs?: unknown[];
}

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    constructorArgs: opts.constructorArgs ?? [],
    ...withValidationDefaults(opts),
  };
}

export interface DeployProxyOptions extends Options {
  initializer?: string | false;
}

export interface UpgradeOptions extends Options {
  call?: { fn: string; args?: unknown[] } | string;
}

const defaultDeployer: Deployer = {
  get provider() {
    return getTruffleConfig().provider;
  },
  async deploy(Contract: ContractClass, ...args: unknown[]): Promise<ContractInstance> {
    return Contract.new(...args);
  },
};
