/* eslint-disable @typescript-eslint/no-var-requires */

import { internalTask, extendEnvironment } from '@nomiclabs/buidler/config';
import { TASK_COMPILE_RUN_COMPILER } from '@nomiclabs/buidler/builtin-tasks/task-names';
import { lazyObject } from '@nomiclabs/buidler/plugins';

import { validate, solcInputOutputDecoder, SolcInput } from '@openzeppelin/upgrades-core';

import { writeValidations } from './validations';

interface RunCompilerArgs {
  input: SolcInput;
}

export default function (): void {
  internalTask(TASK_COMPILE_RUN_COMPILER, async (args: RunCompilerArgs, bre, runSuper) => {
    // TODO: patch input
    const output = await runSuper();
    const decodeSrc = solcInputOutputDecoder(args.input, output);
    const validations = validate(output, decodeSrc);
    await writeValidations(bre, validations);
    return output;
  });

  extendEnvironment(bre => {
    bre.upgrades = lazyObject(() => {
      const { makeDeployProxy } = require('./deploy-proxy');
      const { makeUpgradeProxy } = require('./upgrade-proxy');

      return {
        deployProxy: makeDeployProxy(bre),
        upgradeProxy: makeUpgradeProxy(bre),
      };
    });
  });
}
