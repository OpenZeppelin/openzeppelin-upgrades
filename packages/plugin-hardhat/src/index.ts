/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomicfoundation/hardhat-ethers';
import './type-extensions';
import { subtask, extendEnvironment, extendConfig } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY, TASK_COMPILE_SOLIDITY_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { lazyObject } from 'hardhat/plugins';
import { HardhatConfig, HardhatRuntimeEnvironment } from 'hardhat/types';
import { getImplementationAddressFromBeacon, silenceWarnings, SolcInput } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy';
import type { PrepareUpgradeFunction } from './prepare-upgrade';
import type { UpgradeFunction } from './upgrade-proxy';
import type { DeployBeaconFunction } from './deploy-beacon';
import type { DeployBeaconProxyFunction } from './deploy-beacon-proxy';
import type { UpgradeBeaconFunction } from './upgrade-beacon';
import type { ForceImportFunction } from './force-import';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction, GetInstanceFunction } from './admin';
import type { ValidateImplementationFunction } from './validate-implementation';
import type { ValidateUpgradeFunction } from './validate-upgrade';
import type { DeployImplementationFunction } from './deploy-implementation';
import { DeployAdminFunction, makeDeployProxyAdmin } from './deploy-proxy-admin';
import type { DeployContractFunction } from './deploy-contract';
import type { ProposeUpgradeWithApprovalFunction } from './defender/propose-upgrade-with-approval';
import type { GetDefaultApprovalProcessFunction } from './defender/get-default-approval-process';

export interface HardhatUpgrades {
  deployProxy: DeployFunction;
  upgradeProxy: UpgradeFunction;
  validateImplementation: ValidateImplementationFunction;
  validateUpgrade: ValidateUpgradeFunction;
  deployImplementation: DeployImplementationFunction;
  prepareUpgrade: PrepareUpgradeFunction;
  deployBeacon: DeployBeaconFunction;
  deployBeaconProxy: DeployBeaconProxyFunction;
  upgradeBeacon: UpgradeBeaconFunction;
  deployProxyAdmin: DeployAdminFunction;
  forceImport: ForceImportFunction;
  silenceWarnings: typeof silenceWarnings;
  admin: {
    getInstance: GetInstanceFunction;
    changeProxyAdmin: ChangeAdminFunction;
    transferProxyAdminOwnership: TransferProxyAdminOwnershipFunction;
  };
  erc1967: {
    getAdminAddress: (proxyAdress: string) => Promise<string>;
    getImplementationAddress: (proxyAdress: string) => Promise<string>;
    getBeaconAddress: (proxyAdress: string) => Promise<string>;
  };
  beacon: {
    getImplementationAddress: (beaconAddress: string) => Promise<string>;
  };
}

export interface DefenderHardhatUpgrades extends HardhatUpgrades {
  deployContract: DeployContractFunction;
  proposeUpgradeWithApproval: ProposeUpgradeWithApprovalFunction;
  getDefaultApprovalProcess: GetDefaultApprovalProcessFunction;
}

interface RunCompilerArgs {
  input: SolcInput;
  solcVersion: string;
}

subtask(TASK_COMPILE_SOLIDITY, async (args: { force: boolean }, hre, runSuper) => {
  const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import('./utils/validations');

  try {
    await readValidations(hre);
  } catch (e) {
    if (e instanceof ValidationsCacheOutdated || e instanceof ValidationsCacheNotFound) {
      args = { ...args, force: true };
    } else {
      throw e;
    }
  }

  return runSuper(args);
});

subtask(TASK_COMPILE_SOLIDITY_COMPILE, async (args: RunCompilerArgs, hre, runSuper) => {
  const { validate, solcInputOutputDecoder } = await import('@openzeppelin/upgrades-core');
  const { writeValidations } = await import('./utils/validations');

  // TODO: patch input
  const { output, solcBuild } = await runSuper();

  const { isFullSolcOutput } = await import('./utils/is-full-solc-output');
  if (isFullSolcOutput(output)) {
    const decodeSrc = solcInputOutputDecoder(args.input, output);
    const validations = validate(output, decodeSrc, args.solcVersion);
    await writeValidations(hre, validations);
  }

  return { output, solcBuild };
});

extendEnvironment(hre => {
  hre.upgrades = lazyObject((): HardhatUpgrades => {
    return makeUpgradesFunctions(hre);
  });

  hre.defender = lazyObject((): DefenderHardhatUpgrades => {
    return makeDefenderFunctions(hre);
  });
});

extendConfig((config: HardhatConfig) => {
  // Accumulate references to all the compiler settings, including overrides
  const settings = [];
  for (const compiler of config.solidity.compilers) {
    compiler.settings ??= {};
    settings.push(compiler.settings);
  }
  for (const compilerOverride of Object.values(config.solidity.overrides)) {
    compilerOverride.settings ??= {};
    settings.push(compilerOverride.settings);
  }

  // Enable storage layout in all of them
  for (const setting of settings) {
    setting.outputSelection ??= {};
    setting.outputSelection['*'] ??= {};
    setting.outputSelection['*']['*'] ??= [];

    if (!setting.outputSelection['*']['*'].includes('storageLayout')) {
      setting.outputSelection['*']['*'].push('storageLayout');
    }
  }
});

if (tryRequire('@nomicfoundation/hardhat-verify')) {
  subtask('verify:etherscan').setAction(async (args, hre, runSuper) => {
    const { verify } = await import('./verify-proxy');
    return await verify(args, hre, runSuper);
  });
}

function makeFunctions(hre: HardhatRuntimeEnvironment, defender: boolean) {
  const {
    silenceWarnings,
    getAdminAddress,
    getImplementationAddress,
    getBeaconAddress,
  } = require('@openzeppelin/upgrades-core');
  const { makeDeployProxy } = require('./deploy-proxy');
  const { makeUpgradeProxy } = require('./upgrade-proxy');
  const { makeValidateImplementation } = require('./validate-implementation');
  const { makeValidateUpgrade } = require('./validate-upgrade');
  const { makeDeployImplementation } = require('./deploy-implementation');
  const { makePrepareUpgrade } = require('./prepare-upgrade');
  const { makeDeployBeacon } = require('./deploy-beacon');
  const { makeDeployBeaconProxy } = require('./deploy-beacon-proxy');
  const { makeUpgradeBeacon } = require('./upgrade-beacon');
  const { makeForceImport } = require('./force-import');
  const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership, makeGetInstanceFunction } = require('./admin');

  return {
    silenceWarnings,
    deployProxy: makeDeployProxy(hre, defender),
    upgradeProxy: makeUpgradeProxy(hre, defender), // block on defender
    validateImplementation: makeValidateImplementation(hre),
    validateUpgrade: makeValidateUpgrade(hre),
    deployImplementation: makeDeployImplementation(hre, defender),
    prepareUpgrade: makePrepareUpgrade(hre, defender),
    deployBeacon: makeDeployBeacon(hre, defender), // block on defender
    deployBeaconProxy: makeDeployBeaconProxy(hre, defender),
    upgradeBeacon: makeUpgradeBeacon(hre, defender), // block on defender
    deployProxyAdmin: makeDeployProxyAdmin(hre, defender), // block on defender
    forceImport: makeForceImport(hre),
    admin: {
      getInstance: makeGetInstanceFunction(hre),
      changeProxyAdmin: makeChangeProxyAdmin(hre, defender), // block on defender
      transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre, defender), // block on defender
    },
    erc1967: {
      getAdminAddress: (proxyAddress: string) => getAdminAddress(hre.network.provider, proxyAddress),
      getImplementationAddress: (proxyAddress: string) => getImplementationAddress(hre.network.provider, proxyAddress),
      getBeaconAddress: (proxyAddress: string) => getBeaconAddress(hre.network.provider, proxyAddress),
    },
    beacon: {
      getImplementationAddress: (beaconAddress: string) =>
        getImplementationAddressFromBeacon(hre.network.provider, beaconAddress),
    },
  };
}

function makeUpgradesFunctions(hre: HardhatRuntimeEnvironment): HardhatUpgrades {
  return makeFunctions(hre, false);
}

function makeDefenderFunctions(hre: HardhatRuntimeEnvironment): DefenderHardhatUpgrades {
  const { makeDeployContract } = require('./deploy-contract');
  const { makeProposeUpgradeWithApproval } = require('./defender/propose-upgrade-with-approval');
  const { makeGetDefaultApprovalProcess } = require('./defender/get-default-approval-process');

  return {
    ...makeFunctions(hre, true),
    deployContract: makeDeployContract(hre, true),
    proposeUpgradeWithApproval: makeProposeUpgradeWithApproval(hre, true),
    getDefaultApprovalProcess: makeGetDefaultApprovalProcess(hre),
  };
}

function tryRequire(id: string) {
  try {
    require(id);
    return true;
  } catch (e: any) {
    // do nothing
  }
  return false;
}

export { UpgradeOptions } from './utils/options';
