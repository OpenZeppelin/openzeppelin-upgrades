/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomicfoundation/hardhat-ethers';
import './type-extensions';
import { subtask, extendEnvironment, extendConfig } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY, TASK_COMPILE_SOLIDITY_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { lazyObject } from 'hardhat/plugins';
import { HardhatConfig, HardhatRuntimeEnvironment } from 'hardhat/types';
import { assertUnreachable, type silenceWarnings, type SolcInput, type SolcOutput } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy';
import type { PrepareUpgradeFunction } from './prepare-upgrade';
import type { UpgradeFunction } from './upgrade-proxy';
import type { DeployBeaconFunction } from './deploy-beacon';
import type { DeployBeaconProxyFunction } from './deploy-beacon-proxy';
import type { UpgradeBeaconFunction } from './upgrade-beacon';
import type { ForceImportFunction } from './force-import';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction } from './admin';
import type { ValidateImplementationFunction } from './validate-implementation';
import type { ValidateUpgradeFunction } from './validate-upgrade';
import type { DeployImplementationFunction } from './deploy-implementation';
import type { DeployContractFunction } from './deploy-contract';
import type { ProposeUpgradeWithApprovalFunction } from './defender/propose-upgrade-with-approval';
import type {
  GetDeployApprovalProcessFunction,
  GetUpgradeApprovalProcessFunction,
} from './defender/get-approval-process';

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
  forceImport: ForceImportFunction;
  silenceWarnings: typeof silenceWarnings;
  admin: {
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
  getDeployApprovalProcess: GetDeployApprovalProcessFunction;
  getUpgradeApprovalProcess: GetUpgradeApprovalProcessFunction;
  /**
   * @deprecated Use `getUpgradeApprovalProcess` instead.
   */
  getDefaultApprovalProcess: GetUpgradeApprovalProcessFunction;
}

interface RunCompilerArgs {
  input: SolcInput;
  solcVersion: string;
  quiet: boolean;
}

subtask(TASK_COMPILE_SOLIDITY, async (args: { force: boolean }, hre, runSuper) => {
  const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
    './utils/validations.js'
  );

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
  const { isNamespaceSupported, validate, solcInputOutputDecoder, makeNamespacedInput, trySanitizeNatSpec } =
    await import('@openzeppelin/upgrades-core');
  const { writeValidations } = await import('./utils/validations.js');

  // TODO: patch input
  const { output, solcBuild } = await runSuper();

  const { isFullSolcOutput } = await import('./utils/is-full-solc-output.js');
  if (isFullSolcOutput(output)) {
    const decodeSrc = solcInputOutputDecoder(args.input, output);

    let namespacedOutput = undefined;
    if (isNamespaceSupported(args.solcVersion)) {
      let namespacedInput = makeNamespacedInput(args.input, output, args.solcVersion);
      namespacedInput = await trySanitizeNatSpec(namespacedInput, args.solcVersion);
      namespacedOutput = (await runSuper({ ...args, quiet: true, input: namespacedInput })).output;

      const namespacedCompileErrors = getNamespacedCompileErrors(namespacedOutput);
      if (namespacedCompileErrors.length > 0) {
        // If there are compile errors in the namespaced output, show error or warning if needed, then only use the original output

        const msg = `Failed to compile modified contracts for namespaced storage layout validations:\n\n${namespacedCompileErrors.join('\n')}`;
        const preamble = [
          'Please report this at https://zpl.in/upgrades/report. If possible, include the source code for the contracts mentioned in the errors above.',
          'This step allows for advanced storage modifications such as tight varible packing when performing upgrades with namespaced storage layouts.',
        ];

        switch (hre.config.namespacedCompileErrors) {
          case undefined:
          case 'error': {
            const { UpgradesError } = await import('@openzeppelin/upgrades-core');
            const details = [
              ...preamble,
              'If you are not using namespaced storage, or if you do not anticipate making advanced modifications to namespaces during upgrades,',
              "you can set namespacedCompileErrors: 'warn' or namespacedCompileErrors: 'ignore' in your hardhat config to convert this to a warning or to ignore this.",
            ];
            throw new UpgradesError(msg, () => details.join('\n'));
          }
          case 'warn': {
            const { logWarning } = await import('@openzeppelin/upgrades-core');
            const details = [
              ...preamble,
              'If you are not using namespaced storage, or if you do not anticipate making advanced modifications to namespaces during upgrades,',
              "you can set namespacedCompileErrors: 'ignore' in your hardhat config to ignore this.",
            ];
            logWarning(msg, details);
            break;
          }
          case 'ignore':
            break;
          default:
            assertUnreachable(hre.config.namespacedCompileErrors);
        }

        namespacedOutput = undefined;
      }
    }

    const validations = validate(output, decodeSrc, args.solcVersion, args.input, namespacedOutput);
    await writeValidations(hre, validations);
  }

  return { output, solcBuild };
});

function getNamespacedCompileErrors(namespacedOutput: SolcOutput) {
  const errors = [];
  if (namespacedOutput.errors !== undefined) {
    for (const error of namespacedOutput.errors) {
      if (error.severity === 'error') {
        errors.push(error.formattedMessage);
      }
    }
  }
  return errors;
}

extendEnvironment(hre => {
  hre.upgrades = lazyObject((): HardhatUpgrades => {
    return makeUpgradesFunctions(hre);
  });

  warnOnHardhatDefender();

  hre.defender = lazyObject((): DefenderHardhatUpgrades => {
    return makeDefenderFunctions(hre);
  });
});

function warnOnHardhatDefender() {
  if (tryRequire('@openzeppelin/hardhat-defender', true)) {
    const { logWarning } = require('@openzeppelin/upgrades-core');
    logWarning('The @openzeppelin/hardhat-defender package is deprecated.', [
      'Uninstall the @openzeppelin/hardhat-defender package.',
      'OpenZeppelin Defender integration is included as part of the Hardhat Upgrades plugin.',
    ]);
  }
}

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
    const { verify } = await import('./verify-proxy.js');
    return await verify(args, hre, runSuper);
  });
}

function makeFunctions(hre: HardhatRuntimeEnvironment, defender: boolean) {
  const {
    silenceWarnings,
    getAdminAddress,
    getImplementationAddress,
    getBeaconAddress,
    getImplementationAddressFromBeacon,
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
  const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership } = require('./admin');

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
    forceImport: makeForceImport(hre),
    admin: {
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
  const { makeGetDeployApprovalProcess, makeGetUpgradeApprovalProcess } = require('./defender/get-approval-process');

  const getUpgradeApprovalProcess = makeGetUpgradeApprovalProcess(hre);

  return {
    ...makeFunctions(hre, true),
    deployContract: makeDeployContract(hre, true),
    proposeUpgradeWithApproval: makeProposeUpgradeWithApproval(hre, true),
    getDeployApprovalProcess: makeGetDeployApprovalProcess(hre),
    getUpgradeApprovalProcess: getUpgradeApprovalProcess,
    getDefaultApprovalProcess: getUpgradeApprovalProcess, // deprecated, is an alias for getUpgradeApprovalProcess
  };
}

function tryRequire(id: string, resolveOnly?: boolean) {
  try {
    resolveOnly ? require.resolve(id) : require(id);
    return true;
  } catch (e: any) {
    // do nothing
  }
  return false;
}

export { UpgradeOptions } from './utils/options';
