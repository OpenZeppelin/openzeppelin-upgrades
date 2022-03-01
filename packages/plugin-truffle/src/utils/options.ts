import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { DeployOpts, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type Options = ValidationOptions &
  DeployOpts & {
    deployer?: Deployer;
    constructorArgs?: unknown[];
  };

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    timeout: opts.timeout ?? 60e3, // not used for Truffle, but include these anyways
    pollingInterval: opts.pollingInterval ?? 5e3, // not used for Truffle, but include these anyways
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
