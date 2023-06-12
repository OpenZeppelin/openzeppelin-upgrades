import test from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';
const execAsync = promisify(exec);

test('help', async t => {
  const output = (await execAsync('node dist/cli/cli.js validate --help')).stdout;
  t.snapshot(output);
});

test('no args', async t => {
  const output = (await execAsync('node dist/cli/cli.js')).stdout;
  t.snapshot(output);
});
