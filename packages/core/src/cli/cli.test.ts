import test, { ExecutionContext } from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { rimraf } from 'rimraf';
import { artifacts } from 'hardhat';

const execAsync = promisify(exec);

const CLI = 'node dist/cli/cli.js';

async function getTempDir(t: ExecutionContext) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  t.teardown(() => rimraf(temp));
  return temp;
}

test('help', async t => {
  const output = (await execAsync(`${CLI} validate --help`)).stdout;
  t.snapshot(output);
});

test('no args', async t => {
  const output = (await execAsync(CLI)).stdout;
  t.snapshot(output);
});

test('validate - errors', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:Safe`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp}`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract', async t => {
  // This should check even though the contract is not detected as upgradeable, since the --contract option was used.
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:NonUpgradeable`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract NonUpgradeable`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, has upgrades-from', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:UnsafeAndStorageLayoutErrors`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract UnsafeAndStorageLayoutErrors`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, reference overrides upgrades-from', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:UnsafeAndStorageLayoutErrors`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract UnsafeAndStorageLayoutErrors --reference Safe`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, reference is uups, overrides upgrades-from', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:UnsafeAndStorageLayoutErrors`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract BecomesBadLayout --reference HasUpgradeTo`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, reference', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract BecomesBadLayout --reference StorageV1`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, reference with same build info dir', async t => {
  const temp = await getTempDir(t);
  const buildInfoDir = path.join(temp, 'build-info');
  await fs.mkdir(buildInfoDir);

  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(buildInfoDir, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${buildInfoDir} --contract BecomesBadLayout --reference build-info:StorageV1`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - single contract, reference, fully qualified names', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${temp} --contract contracts/test/cli/Validate.sol:BecomesBadLayout --reference contracts/test/cli/Validate.sol:StorageV1`,
    ),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - reference without contract option', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --reference StorageV1`));
  t.true(
    error?.message.includes('The --reference option can only be used along with the --contract option.'),
    error?.message,
  );
});

test('validate - empty contract string', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract --reference StorageV1`));
  t.true(error?.message.includes('Invalid option: --contract cannot be empty'), error?.message);
});

test('validate - blank contract string', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract '    ' --reference StorageV1`));
  t.true(error?.message.includes('Invalid option: --contract cannot be empty'), error?.message);
});

test('validate - empty reference string', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract StorageV1 --reference`));
  t.true(error?.message.includes('Invalid option: --reference cannot be empty'), error?.message);
});

test('validate - single contract not found', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract NonExistent`));
  t.true(error?.message.includes('Could not find contract NonExistent.'), error?.message);
});

test('validate - reference not found', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract BecomesBadLayout --reference NonExistent`),
  );
  t.true(error?.message.includes('Could not find contract NonExistent.'), error?.message);
});

test('validate - requireReference - no contract option', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --requireReference`));
  t.true(
    error?.message.includes('The --requireReference option can only be used along with the --contract option.'),
    error?.message,
  );
});

test('validate - requireReference - no reference, no upgradesFrom', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract StorageV1 --requireReference`));
  t.true(error?.message.includes('does not specify what contract it upgrades from'), error?.message);
});

test('validate - requireReference and unsafeSkipStorageCheck', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV1`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract StorageV1 --requireReference --unsafeSkipStorageCheck`),
  );
  t.true(
    error?.message.includes('The requireReference and unsafeSkipStorageCheck options cannot be used at the same time.'),
    error?.message,
  );
});

test('validate - requireReference - no reference, has upgradesFrom - safe', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesSafe`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp} --contract BecomesSafe --requireReference`)).stdout;
  t.snapshot(output);
});

test('validate - requireReference - no reference, has upgradesFrom - unsafe', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract BecomesBadLayout --requireReference`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - requireReference - has reference - unsafe', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV2_Bad_NoAnnotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract StorageV2_Bad_NoAnnotation --reference StorageV1 --requireReference`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - requireReference - has reference - safe', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:StorageV2_Ok_NoAnnotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (
    await execAsync(
      `${CLI} validate ${temp} --contract StorageV2_Ok_NoAnnotation --reference StorageV1 --requireReference`,
    )
  ).stdout;
  t.snapshot(output);
});

test('validate - no upgradeable', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Storage088.sol:Storage088`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
  t.snapshot(output);
});

test('validate - ok', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Annotation.sol:Annotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
  t.snapshot(output);
});

test('validate - single contract - ok', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Annotation.sol:Annotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp} --contract Annotation`)).stdout;
  t.snapshot(output);
});

test('validate - fully qualified version of ambiguous contract name', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/ValidationsSameNameSafe.sol:SameName`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (
    await execAsync(`${CLI} validate ${temp} --contract contracts/test/ValidationsSameNameSafe.sol:SameName`)
  ).stdout;
  t.snapshot(output);
});

test('validate - references fully qualified version of ambiguous contract name', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/ValidationsSameNameSafe.sol:SameName`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (
    await execAsync(
      `${CLI} validate ${temp} --contract contracts/test/ValidationsSameNameSafe.sol:SameName --reference contracts/test/ValidationsSameNameUnsafe.sol:SameName`,
    )
  ).stdout;
  t.snapshot(output);
});

test('validate - references other build info dir by command - ok', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const output = await execAsync(
    `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract MyContract --reference build-info-v1:MyContract`,
  );
  t.snapshot(output);
});

test('validate - references other build info dir by command - reference not found', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract MyContract --reference build-info-not-found:MyContract`,
    ),
  );
  t.true(error?.message.includes('Could not find contract build-info-not-found:MyContract.'), error?.message);
});

test('validate - references other build info dir by command - dir not found', async t => {
  const temp = await getTempDir(t);

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs build-info-not-found --contract MyContract --reference build-info-not-found:MyContract`,
    ),
  );
  t.true(
    error?.message.includes(
      "The directory 'build-info-not-found' does not exist or does not contain any build info files.",
    ),
    error?.message,
  );
});

test('validate - references other build info dir by command with fully qualified names - ok', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const output = await execAsync(
    `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract --reference build-info-v1:contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`,
  );
  t.snapshot(output);
});

test('validate - references other build info dir by command - bad', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Bad.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract MyContract --reference build-info-v1:MyContract`,
    ),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - references other build info dir by command with fully qualified names - bad', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Bad.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract contracts/test/cli/ValidateBuildInfoV2_Bad.sol:MyContract --reference build-info-v1:contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`,
    ),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

async function setupMultipleBuildInfoDirsTest(t: ExecutionContext<unknown>) {
  const temp = await getTempDir(t);

  const v1Dir = path.join(temp, 'build-info-v1');
  await fs.mkdir(v1Dir);
  const v1BuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(v1Dir, 'validate.json'), JSON.stringify(v1BuildInfo));

  const v2Dir = path.join(temp, 'build-info-v2');
  await fs.mkdir(v2Dir);
  const v2BuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(v2Dir, 'validate.json'), JSON.stringify(v2BuildInfo));

  const v2BranchDir = path.join(temp, 'build-info-v2-branch');
  await fs.mkdir(v2BranchDir);
  const v2BranchBuildInfoOk = await artifacts.getBuildInfo(
    `contracts/test/cli/ValidateBuildInfoV2_Branch_Ok.sol:MyContract`,
  );
  const v2BranchBuildInfoBad = await artifacts.getBuildInfo(
    `contracts/test/cli/ValidateBuildInfoV2_Branch_Bad.sol:MyContract`,
  );
  await fs.writeFile(path.join(v2BranchDir, 'ok.json'), JSON.stringify(v2BranchBuildInfoOk));
  await fs.writeFile(path.join(v2BranchDir, 'bad.json'), JSON.stringify(v2BranchBuildInfoBad));
  return { v2BranchDir, v1Dir, v2Dir };
}

test('validate - references multiple build info dirs by annotation', async t => {
  const { v2BranchDir, v1Dir, v2Dir } = await setupMultipleBuildInfoDirsTest(t);

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${v2BranchDir} --referenceBuildInfoDirs ${v1Dir},${v2Dir}`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - references multiple build info dirs by annotation - same arg multiple times', async t => {
  const { v2BranchDir, v1Dir, v2Dir } = await setupMultipleBuildInfoDirsTest(t);

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${v2BranchDir} --referenceBuildInfoDirs ${v1Dir} --referenceBuildInfoDirs ${v2Dir}`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - references other build info dir by annotation - ok', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(
    `contracts/test/cli/ValidateBuildInfoV2_Annotation_Ok.sol:MyContract`,
  );
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const output = await execAsync(
    `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract MyContract`,
  );
  t.snapshot(output);
});

test('validate - references other build info dir by annotation - bad', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  t.assert(updatedDir !== referenceDir);
  const updatedBuildInfo = await artifacts.getBuildInfo(
    `contracts/test/cli/ValidateBuildInfoV2_Annotation_Bad.sol:MyContract`,
  );
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract MyContract`),
  );
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - contract must not have build info dir name', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract build-info:MyContract --reference build-info-v1:MyContract`,
    ),
  );
  t.true(
    error?.message.includes('Contract build-info:MyContract must be specified without a build info directory name'),
    error?.message,
  );
});

test('validate - contract must not have build info dir name - fully qualified', async t => {
  const temp = await getTempDir(t);
  const referenceDir = path.join(temp, 'build-info-v1');
  await fs.mkdir(referenceDir);

  const referenceBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV1.sol:MyContract`);
  await fs.writeFile(path.join(referenceDir, 'validate.json'), JSON.stringify(referenceBuildInfo));

  const updatedDir = path.join(temp, 'build-info');
  await fs.mkdir(updatedDir);

  const updatedBuildInfo = await artifacts.getBuildInfo(`contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract`);
  await fs.writeFile(path.join(updatedDir, 'validate.json'), JSON.stringify(updatedBuildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${updatedDir} --referenceBuildInfoDirs ${referenceDir} --contract build-info:contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract --reference build-info-v1:MyContract`,
    ),
  );
  t.true(
    error?.message.includes(
      'Contract build-info:contracts/test/cli/ValidateBuildInfoV2_Ok.sol:MyContract must be specified without a build info directory name',
    ),
    error?.message,
  );
});

test('validate - excludes by pattern - no match', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/UsesAbstractUUPS.sol:UsesAbstractUUPS`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --exclude "**/NoMatch.sol"`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - excludes by pattern - some match', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/UsesAbstractUUPS.sol:UsesAbstractUUPS`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --exclude "**/Abstract*.sol"`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - excludes by pattern - all match', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/UsesAbstractUUPS.sol:UsesAbstractUUPS`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = await execAsync(`${CLI} validate ${temp} --exclude "**/excludes/*.sol"`);
  t.snapshot(output);
});

test('validate - excludes by pattern - all match using commas within glob', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/UsesAbstractUUPS.sol:UsesAbstractUUPS`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = await execAsync(`${CLI} validate ${temp} --exclude "**/excludes/{Abstract*,UsesAbstractUUPS}.sol"`);
  t.snapshot(output);
});

test('validate - exclude passed multiple times', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/UsesAbstractUUPS.sol:UsesAbstractUUPS`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = await execAsync(
    `${CLI} validate ${temp} --exclude "**/excludes/Abstract*.sol" --exclude "**/UsesAbstractUUPS.sol"`,
  );
  t.snapshot(output);
});

test('validate - excludes specified contract', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:BecomesBadLayout`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract BecomesBadLayout --reference StorageV1 --exclude "**/Validate.sol"`),
  );
  t.true(
    error?.message.includes('No validation report found for contract contracts/test/cli/Validate.sol:BecomesBadLayout'),
    error?.message,
  );
});

test('validate - excludes UpgradeableBeacon and its parents by default', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/ImportVersionsAndBeacon.sol:Dummy`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp}`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - excludes UpgradeableBeacon and its parents by default, and excludes one contract from layout comparisions', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/excludes/ImportVersionsAndBeacon.sol:Dummy`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --exclude "**/V2Bad1.sol"`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - self reference by annotation', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/SelfReferences.sol:SelfReference`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract SelfReference`));
  t.assert(error?.message.includes('must not use itself as a reference'), error?.message);
});

test('validate - self reference by fully qualified annotation', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/SelfReferences.sol:SelfReference`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp} --contract SelfReferenceFullyQualified`));
  t.assert(error?.message.includes('must not use itself as a reference'), error?.message);
});

test('validate - self reference by option', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/SelfReferences.sol:SelfReference`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(`${CLI} validate ${temp} --contract NoAnnotation --reference NoAnnotation`),
  );
  t.assert(error?.message.includes('must not use itself as a reference'), error?.message);
});

test('validate - self reference by fully qualified option', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/SelfReferences.sol:SelfReference`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(
    execAsync(
      `${CLI} validate ${temp} --contract NoAnnotation --reference contracts/test/cli/SelfReferences.sol:NoAnnotation`,
    ),
  );
  t.assert(error?.message.includes('must not use itself as a reference'), error?.message);
});
