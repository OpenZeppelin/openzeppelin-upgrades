/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomiclabs/hardhat-ethers';
import './type-extensions';
import { subtask, extendEnvironment } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { lazyObject } from 'hardhat/plugins';
import { validate, solcInputOutputDecoder, SolcInput } from '@openzeppelin/upgrades-core';
import { writeValidations } from './validations';

interface RunCompilerArgs {
  input: SolcInput;
}

subtask(TASK_COMPILE_SOLIDITY_COMPILE, async (args: RunCompilerArgs, hre, runSuper) => {
  // TODO: patch input
  const { output, solcBuild } = await runSuper();
  const decodeSrc = solcInputOutputDecoder(args.input, output);
  const validations = validate(output, decodeSrc);
  await writeValidations(hre, validations);
  return { output, solcBuild };
});

extendEnvironment(hre => {
  hre.upgrades = lazyObject(() => {
    const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership } = require('./admin');
    const { makeDeployProxy } = require('./deploy-proxy');
    const { makeUpgradeProxy, makePrepareUpgrade } = require('./upgrade-proxy');

    return {
      deployProxy: makeDeployProxy(hre),
      upgradeProxy: makeUpgradeProxy(hre),
      prepareUpgrade: makePrepareUpgrade(hre),
      admin: {
        changeProxyAdmin: makeChangeProxyAdmin(hre),
        transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre),
      },
    };
  });
});
