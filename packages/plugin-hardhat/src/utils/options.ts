import { SourceCodeLicense } from '@openzeppelin/defender-sdk-deploy-client';
import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';
import { Overrides } from 'ethers';

/**
 * Options for functions that can deploy an implementation contract.
 */
export type StandaloneOptions = StandaloneValidationOptions &
  DeployOpts &
  EthersDeployOptions & {
    constructorArgs?: unknown[];
    /**
     * @deprecated Use `redeployImplementation = 'never'` instead.
     */
    useDeployedImplementation?: boolean;
    redeployImplementation?: 'always' | 'never' | 'onchange';
  };

/**
 * Options for functions that can deploy a new version of an implementation contract for upgrading.
 */
export type UpgradeOptions = ValidationOptions & StandaloneOptions;

export function withDefaults(opts: UpgradeOptions = {}): Required<UpgradeOptions> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    timeout: opts.timeout ?? 60e3,
    pollingInterval: opts.pollingInterval ?? 5e3,
    useDeployedImplementation: opts.useDeployedImplementation ?? false,
    redeployImplementation: opts.redeployImplementation ?? 'onchange',
    txOverrides: opts.txOverrides ?? {},
    ...withValidationDefaults(opts),
  };
}

/**
 * Option for functions that support getting a transaction response.
 */
export type GetTxResponse = {
  getTxResponse?: boolean;
};

type Initializer = {
  initializer?: string | false;
};

/**
 * Option to enable or disable Defender deployments.
 */
export type DefenderDeploy = {
  useDefenderDeploy?: boolean;
};

/**
 * Options for functions that support Defender deployments.
 */
export type DefenderDeployOptions = DefenderDeploy & {
  verifySourceCode?: boolean;
  relayerId?: string;
  salt?: string;
  createFactoryAddress?: string;
  licenseType?: SourceCodeLicense;
  skipLicenseType?: boolean;
};

/**
 * Option to enable or disable SafeGlobal deployments.
 */
export type SafeGlobalDeploy = {
  useSafeGlobalDeploy?: boolean;
};

/**
 * Options for functions that support SafeGlobal deployments.
 */
export type SafeGlobalDeployOptions = SafeGlobalDeploy & {
  txServiceUrl?: string;
  salt?: string;
  safeAddress?: string;
  safeSingletonAddress?: string;
  safeProxyFactoryAddress?: string;
  multiSendAddress?: string;
  multiSendCallOnlyAddress?: string;
  fallbackHandlerAddress?: string;
  signMessageLibAddress?: string;
  createCallAddress?: string;
  simulateTxAccessorAddress?: string;
};

/**
 * Options for functions that support deployments through ethers.js.
 */
export type EthersDeployOptions = {
  /**
   * Overrides for the transaction sent to deploy a contract.
   */
  txOverrides?: Overrides;
};

export type InitialOwner = {
  initialOwner?: string;
};

export type DeployBeaconProxyOptions = EthersDeployOptions &
  DeployOpts &
  ProxyKindOption &
  Initializer &
  DefenderDeployOptions &
  SafeGlobalDeployOptions;
export type DeployBeaconOptions = StandaloneOptions & InitialOwner & DefenderDeploy & SafeGlobalDeployOptions;
export type DeployImplementationOptions = StandaloneOptions &
  GetTxResponse &
  DefenderDeployOptions &
  SafeGlobalDeployOptions;
export type DeployContractOptions = Omit<StandaloneOptions, 'txOverrides'> & // ethers deployment not supported for deployContract
  GetTxResponse &
  DefenderDeployOptions & {
    unsafeAllowDeployContract?: boolean;
  } & SafeGlobalDeployOptions;
export type DeployProxyOptions = StandaloneOptions &
  Initializer &
  InitialOwner &
  DefenderDeployOptions &
  SafeGlobalDeployOptions;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions & GetTxResponse & DefenderDeployOptions & SafeGlobalDeployOptions;
export type UpgradeBeaconOptions = UpgradeOptions & DefenderDeploy & SafeGlobalDeployOptions;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
} & DefenderDeploy &
  SafeGlobalDeployOptions;
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
