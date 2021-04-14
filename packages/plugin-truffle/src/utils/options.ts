import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { ProxyDeployment, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type ProxyKind = 'auto' | ProxyDeployment['kind'];

export interface Options extends ValidationOptions {
  deployer?: Deployer;
  kind?: ProxyKind;
}

export function withDefaults(opts: Options): Required<Options> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    kind: opts.kind ?? 'auto',
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
