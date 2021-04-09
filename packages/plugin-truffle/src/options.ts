import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type Options = DeployOptions & ValidationOptions;

export function withDefaults(opts: Options): Required<Options> {
  const { deployer } = withDeployDefaults(opts);
  return {
    deployer,
    ...withValidationDefaults(opts),
  };
}

export interface DeployOptions {
  deployer?: Deployer;
}

export function withDeployDefaults(opts: DeployOptions): Required<DeployOptions> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
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
