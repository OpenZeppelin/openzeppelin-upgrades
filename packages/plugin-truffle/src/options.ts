import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';

export interface Options {
  deployer?: Deployer;
}

export function withDefaults(opts: Options): Required<Options> {
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
