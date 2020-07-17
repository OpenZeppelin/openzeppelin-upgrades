import { internalTask } from '@nomiclabs/buidler/config';
import { TASK_COMPILE_RUN_COMPILER } from '@nomiclabs/buidler/builtin-tasks/task-names';
import {
  validate,
  solcInputOutputDecoder,
  SolcInput,
} from '@openzeppelin/upgrades-core';
import { promises as fs } from 'fs';

interface RunCompilerArgs {
  input: SolcInput;
}

export default function (): void {
  internalTask(
    TASK_COMPILE_RUN_COMPILER,
    async (args: RunCompilerArgs, bre, runSuper) => {
      // TODO: patch input
      const output = await runSuper();
      const decodeSrc = solcInputOutputDecoder(args.input, output);
      const validations = validate(output, decodeSrc);
      await fs.mkdir('cache', { recursive: true });
      await fs.writeFile(
        'cache/validations.json',
        JSON.stringify(validations, null, 2),
      );
      return output;
    },
  );
}
