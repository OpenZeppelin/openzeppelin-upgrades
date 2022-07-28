import { Deployer, ContractClass, ContractInstance, getTruffleConfig } from './truffle';
import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';

type TruffleDeployer = {
  deployer?: Deployer;
};

export type StandaloneOptions = StandaloneValidationOptions &
  DeployOpts &
  TruffleDeployer & {
    constructorArgs?: unknown[];
    useDeployedImplementation?: boolean;
  };

export type UpgradeOptions = ValidationOptions & StandaloneOptions;

export function withDefaults(opts: UpgradeOptions = {}): Required<UpgradeOptions> {
  return {
    deployer: opts.deployer ?? defaultDeployer,
    timeout: opts.timeout ?? 60e3, // not used for Truffle, but include these anyways
    pollingInterval: opts.pollingInterval ?? 5e3, // not used for Truffle, but include these anyways
    constructorArgs: opts.constructorArgs ?? [],
    useDeployedImplementation: opts.useDeployedImplementation ?? true,
    ...withValidationDefaults(opts),
  };
}

type Initializer = {
  initializer?: string | false;
};

export type DeployBeaconProxyOptions = ProxyKindOption & Initializer & TruffleDeployer;
export type DeployBeaconOptions = StandaloneOptions;
export type DeployImplementationOptions = StandaloneOptions;
export type DeployProxyAdminOptions = DeployOpts & TruffleDeployer;
export type DeployProxyOptions = StandaloneOptions & Initializer;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions;
export type UpgradeBeaconOptions = UpgradeOptions;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
};
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;

const defaultDeployer: Deployer = {
  get provider() {
    return getTruffleConfig().provider;
  },
  async deploy(Contract: ContractClass, ...args: unknown[]): Promise<ContractInstance> {
    return Contract.new(...args);
  },
};
