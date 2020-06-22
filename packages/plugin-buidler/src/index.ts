import { internalTask, extendEnvironment } from "@nomiclabs/buidler/config";
import { TASK_COMPILE_RUN_COMPILER } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { validate } from '@openzeppelin/upgrades-core';
import { promises as fs } from 'fs';

export default function () {
  internalTask(TASK_COMPILE_RUN_COMPILER, async (args, bre, runSuper) => {
    // TODO: patch input
    const output = await runSuper();
    const validations = validate(output);
    await fs.mkdir('cache', { recursive: true });
    await fs.writeFile('cache/validations.json', JSON.stringify(validations, null, 2));
    return output;
  });
};
