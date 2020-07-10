import { internalTask, extendEnvironment } from "@nomiclabs/buidler/config";
import { TASK_COMPILE_RUN_COMPILER } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { validate, solcInputOutputDecoder } from '@openzeppelin/upgrades-core';
import { promises as fs } from 'fs';

export default function () {
  internalTask(TASK_COMPILE_RUN_COMPILER, async (args, bre, runSuper) => {
    // TODO: patch input
    const output = await runSuper();
    const decodeSrc = solcInputOutputDecoder((args as any).input, output);
    const validations = validate(output, decodeSrc);
    await fs.mkdir('cache', { recursive: true });
    await fs.writeFile('cache/validations.json', JSON.stringify(validations, null, 2));
    return output;
  });
};
