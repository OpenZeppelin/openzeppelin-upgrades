import test, { ExecutionContext } from 'ava';

import { promises as fs } from 'fs';
import { rimraf } from 'rimraf';
import path from 'path';
import os from 'os';
import { BuildInfoFile, getBuildInfoFiles } from './build-info-file';

test.beforeEach(async t => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), `upgrades-core-test-${t.title.replace(/\s/g, '-')}-`)));
});

test.afterEach(async () => {
  await rimraf(process.cwd());
});

const BUILD_INFO = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  output: {
    sources: {
      'mypath/MyContract.sol': {
        ast: {},
        id: 123,
      },
    },
  },
};

const BUILD_INFO_2 = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContractModified {}',
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  output: {
    sources: {
      'mypath/MyContract.sol': {
        ast: {},
        id: 456,
      },
    },
  },
};

const BUILD_INFO_NO_LAYOUT = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi'],
        },
      },
    },
  },
  output: {
    sources: {
      'mypath/MyContract.sol': {
        ast: {},
        id: 123,
      },
    },
  },
};

test.serial('get build info files - default hardhat', async t => {
  await fs.mkdir('artifacts/build-info', { recursive: true });
  await fs.mkdir('out/build-info', { recursive: true }); // should be ignored since it's empty

  await fs.writeFile('artifacts/build-info/build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('artifacts/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = await getBuildInfoFiles();

  assertBuildInfoFiles(t, buildInfoFiles);
});

test.serial('get build info files - default foundry', async t => {
  await fs.mkdir('out/build-info', { recursive: true });
  await fs.mkdir('artifacts/build-info', { recursive: true }); // should be ignored since it's empty

  await fs.writeFile('out/build-info/build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('out/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = await getBuildInfoFiles();

  assertBuildInfoFiles(t, buildInfoFiles);
});

test.serial('get build info files - both hardhat and foundry dirs exist', async t => {
  await fs.mkdir('artifacts/build-info', { recursive: true });
  await fs.writeFile('artifacts/build-info/build-info.json', JSON.stringify(BUILD_INFO));

  await fs.mkdir('out/build-info', { recursive: true });
  await fs.writeFile('out/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const error = await t.throwsAsync(getBuildInfoFiles());
  t.true(error?.message.includes('Found both Hardhat and Foundry build info directories'));
});

test.serial('get build info files - no default dirs exist', async t => {
  const error = await t.throwsAsync(getBuildInfoFiles());
  t.true(error?.message.includes('Could not find the default Hardhat or Foundry build info directory'));
});

test.serial('get build info files - override with custom relative path', async t => {
  await fs.mkdir('artifacts/build-info', { recursive: true });
  await fs.mkdir('out/build-info', { recursive: true });

  await fs.mkdir('custom/build-info', { recursive: true });

  await fs.writeFile('custom/build-info/build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('custom/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = await getBuildInfoFiles('custom/build-info');

  assertBuildInfoFiles(t, buildInfoFiles);
});

test.serial('get build info files - override with custom absolute path', async t => {
  await fs.mkdir('artifacts/build-info', { recursive: true });
  await fs.mkdir('out/build-info', { recursive: true });

  await fs.mkdir('custom/build-info', { recursive: true });

  await fs.writeFile('custom/build-info/build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('custom/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = await getBuildInfoFiles(path.join(process.cwd(), 'custom/build-info'));

  assertBuildInfoFiles(t, buildInfoFiles);
});

test.serial('invalid build info file', async t => {
  await fs.mkdir('invalid-build-info', { recursive: true });

  await fs.writeFile('invalid-build-info/invalid.json', JSON.stringify({ output: {} }));
  const error = await t.throwsAsync(getBuildInfoFiles('invalid-build-info'));
  t.true(error?.message.includes('must contain Solidity compiler input, output, and solcVersion'));
});

test.serial('dir does not exist', async t => {
  const error = await t.throwsAsync(getBuildInfoFiles('invalid-dir'));
  t.true(error?.message.includes('does not exist'));
});

test.serial('no build info files', async t => {
  await fs.mkdir('empty-dir', { recursive: true });
  await fs.writeFile('empty-dir/notjson.txt', 'abc');

  const error = await t.throwsAsync(getBuildInfoFiles('empty-dir'));
  t.true(error?.message.includes('does not contain any build info files'));
});

test.serial('no storage layout', async t => {
  await fs.mkdir('no-storage-layout', { recursive: true });
  await fs.writeFile('no-storage-layout/build-info.json', JSON.stringify(BUILD_INFO_NO_LAYOUT));

  const error = await t.throwsAsync(getBuildInfoFiles('no-storage-layout'));
  t.true(error?.message.includes('does not contain storage layout'));
});

function assertBuildInfoFiles(t: ExecutionContext, buildInfoFiles: BuildInfoFile[]) {
  t.is(buildInfoFiles.length, 2);

  const buildInfoFile1 = buildInfoFiles.find(
    b => b.input.sources['mypath/MyContract.sol'].content === 'contract MyContract {}',
  );
  const buildInfoFile2 = buildInfoFiles.find(
    b => b.input.sources['mypath/MyContract.sol'].content === 'contract MyContractModified {}',
  );

  if (buildInfoFile1 === undefined || buildInfoFile2 === undefined) {
    t.fail('build info files not found');
  } else {
    t.is(buildInfoFile1.output.sources['mypath/MyContract.sol'].id, 123);
    t.is(buildInfoFile2.output.sources['mypath/MyContract.sol'].id, 456);
  }
}
