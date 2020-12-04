/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomiclabs/hardhat-ethers';
import './type-extensions';
import { subtask, extendEnvironment } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { lazyObject } from 'hardhat/plugins';
import { validate, solcInputOutputDecoder, SolcInput } from '@openzeppelin/upgrades-core';
import { writeValidations } from './validations';

import type { silenceWarnings } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy';
import type { UpgradeFunction, PrepareUpgradeFunction } from './upgrade-proxy';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction } from './admin';

export interface HardhatUpgrades {
  deployProxy: DeployFunction;
  upgradeProxy: UpgradeFunction;
  prepareUpgrade: PrepareUpgradeFunction;
  silenceWarnings: typeof silenceWarnings;
  admin: {
    changeProxyAdmin: ChangeAdminFunction;
    transferProxyAdminOwnership: TransferProxyAdminOwnershipFunction;
  };
}

interface RunCompilerArgs {
  input: SolcInput;
}

subtask(TASK_COMPILE_SOLIDITY_COMPILE, async (args: RunCompilerArgs, hre, runSuper) => {
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
  hre.upgrades = lazyObject(
    (): HardhatUpgrades => {
      const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership } = require('./admin');
      const { makeDeployProxy } = require('./deploy-proxy');
      const { makeUpgradeProxy, makePrepareUpgrade } = require('./upgrade-proxy');
      const { silenceWarnings } = require('@openzeppelin/upgrades-core');

      return {
        silenceWarnings,
        deployProxy: makeDeployProxy(hre),
        upgradeProxy: makeUpgradeProxy(hre),
        prepareUpgrade: makePrepareUpgrade(hre),
        admin: {
          changeProxyAdmin: makeChangeProxyAdmin(hre),
          transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre),
        },
      };
    },
  );
});
