import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { ProxyDeployment, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type Options = DeployOptions & ValidationOptions;

export type ProxyKind = 'auto' | ProxyDeployment['kind'];
export type ProxyInitializer = string | false;

export interface DeployOptions {
  deployer?: Deployer;
  initializer?: ProxyInitializer;
  kind?: ProxyKind;
}

export function withDeployDefaults(opts: DeployOptions): Required<DeployOptions> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    initializer: opts.initializer ?? 'initialize',
    kind: opts.kind ?? 'auto',
  };
}

export function withDefaults(opts: Options): Required<Options> {
  return {
    ...withDeployDefaults(opts),
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
