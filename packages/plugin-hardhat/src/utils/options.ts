import { DeployMetadata, SourceCodeLicense } from '@openzeppelin/defender-sdk-deploy-client';
import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';
import { ContractFactory, Overrides } from 'ethers';
import { EthersOrDefenderDeployment } from './deploy';

/**
 * Options for customizing the factory or deploy functions
 */
export type DeployFactoryOpts = {
  /**
   * Allows to customize the ethers ContractFactory of the proxy to deploy, instead of using the ones defined in utils/factories.ts
   */
  proxyFactory?: ContractFactory;

  /**
   * Allows to customize the deploy function used instead of utils/deploy.ts:deploy
   */
  deployFunction?: () => Promise<EthersOrDefenderDeployment>;
};

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
  metadata?: DeployMetadata;
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

  /**
   * Skips checking the `initialOwner` option when deploying a transparent proxy.
   */
  unsafeSkipProxyAdminCheck?: boolean;
};

export type DeployBeaconProxyOptions = EthersDeployOptions &
  DeployOpts &
  DeployFactoryOpts &
  ProxyKindOption &
  Initializer &
  DefenderDeployOptions;
export type DeployBeaconOptions = StandaloneOptions & InitialOwner & DefenderDeploy;
export type DeployImplementationOptions = StandaloneOptions & GetTxResponse & DefenderDeployOptions;
export type DeployContractOptions = Omit<StandaloneOptions, 'txOverrides'> & // ethers deployment not supported for deployContract
  GetTxResponse &
  DefenderDeployOptions & {
    unsafeAllowDeployContract?: boolean;
  };
export type DeployProxyOptions = StandaloneOptions &
  DeployFactoryOpts &
  Initializer &
  InitialOwner &
  DefenderDeployOptions;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions & GetTxResponse & DefenderDeployOptions;
export type UpgradeBeaconOptions = UpgradeOptions & DefenderDeploy;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
} & DefenderDeploy;
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
