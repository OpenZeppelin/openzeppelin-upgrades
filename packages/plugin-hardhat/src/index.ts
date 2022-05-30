/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomiclabs/hardhat-ethers';
import './type-extensions';
import { subtask, extendEnvironment, extendConfig, task } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY, TASK_COMPILE_SOLIDITY_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { lazyObject } from 'hardhat/plugins';
import { HardhatConfig } from 'hardhat/types';
import { getImplementationAddressFromBeacon, silenceWarnings, SolcInput } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy';
import type { PrepareUpgradeFunction } from './prepare-upgrade';
import type { UpgradeFunction } from './upgrade-proxy';
import type { DeployBeaconFunction } from './deploy-beacon';
import type { DeployBeaconProxyFunction } from './deploy-beacon-proxy';
import type { UpgradeBeaconFunction } from './upgrade-beacon';
import type { ForceImportFunction } from './force-import';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction, GetInstanceFunction } from './admin';

export interface HardhatUpgrades {
  deployProxy: DeployFunction;
  upgradeProxy: UpgradeFunction;
  prepareUpgrade: PrepareUpgradeFunction;
  deployBeacon: DeployBeaconFunction;
  deployBeaconProxy: DeployBeaconProxyFunction;
  upgradeBeacon: UpgradeBeaconFunction;
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

interface RunCompilerArgs {
  input: SolcInput;
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
    const validations = validate(output, decodeSrc);
    await writeValidations(hre, validations);
  }

  return { output, solcBuild };
});

extendEnvironment(hre => {
  hre.upgrades = lazyObject((): HardhatUpgrades => {
    const {
      silenceWarnings,
      getAdminAddress,
      getImplementationAddress,
      getBeaconAddress,
    } = require('@openzeppelin/upgrades-core');
    const { makeDeployProxy } = require('./deploy-proxy');
    const { makeUpgradeProxy } = require('./upgrade-proxy');
    const { makePrepareUpgrade } = require('./prepare-upgrade');
    const { makeDeployBeacon } = require('./deploy-beacon');
    const { makeDeployBeaconProxy } = require('./deploy-beacon-proxy');
    const { makeUpgradeBeacon } = require('./upgrade-beacon');
    const { makeForceImport } = require('./force-import');
    const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership, makeGetInstanceFunction } = require('./admin');

    return {
      silenceWarnings,
      deployProxy: makeDeployProxy(hre),
      upgradeProxy: makeUpgradeProxy(hre),
      prepareUpgrade: makePrepareUpgrade(hre),
      deployBeacon: makeDeployBeacon(hre),
      deployBeaconProxy: makeDeployBeaconProxy(hre),
      upgradeBeacon: makeUpgradeBeacon(hre),
      forceImport: makeForceImport(hre),
      admin: {
        getInstance: makeGetInstanceFunction(hre),
        changeProxyAdmin: makeChangeProxyAdmin(hre),
        transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre),
      },
      erc1967: {
        getAdminAddress: proxyAddress => getAdminAddress(hre.network.provider, proxyAddress),
        getImplementationAddress: proxyAddress => getImplementationAddress(hre.network.provider, proxyAddress),
        getBeaconAddress: proxyAddress => getBeaconAddress(hre.network.provider, proxyAddress),
      },
      beacon: {
        getImplementationAddress: beaconAddress =>
          getImplementationAddressFromBeacon(hre.network.provider, beaconAddress),
      },
    };
  });
});

extendConfig((config: HardhatConfig) => {
  for (const compiler of config.solidity.compilers) {
    compiler.settings ??= {};
    compiler.settings.outputSelection ??= {};
    compiler.settings.outputSelection['*'] ??= {};
    compiler.settings.outputSelection['*']['*'] ??= [];

    if (!compiler.settings.outputSelection['*']['*'].includes('storageLayout')) {
      compiler.settings.outputSelection['*']['*'].push('storageLayout');
    }
  }
});

task('verify').setAction(async (args, hre, runSuper) => {
  const { verify } = await import('./verify-proxy');
  return await verify(args, hre, runSuper);
});
