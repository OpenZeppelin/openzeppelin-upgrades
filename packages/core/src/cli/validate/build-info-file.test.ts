import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import util from 'util';
import path from 'path';
import os from 'os';
import { getBuildInfoFiles } from './build-info-file';

const rimraf = util.promisify(rimrafAsync);

test.before(async () => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
});

test.after(async () => {
  await rimraf(process.cwd());
});

const BUILD_INFO = {
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
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
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContractModified {}',
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

test('get build info files', async t => {
  await fs.writeFile('build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = getBuildInfoFiles([
    'build-info.json', // relative path
    path.join(process.cwd(), 'build-info-2.json'), // absolute path
  ]);
  t.is(buildInfoFiles.length, 2);
  t.is(buildInfoFiles[0].input.sources['mypath/MyContract.sol'].content, 'contract MyContract {}');
  t.is(buildInfoFiles[0].output.sources['mypath/MyContract.sol'].id, 123);
  t.is(buildInfoFiles[1].input.sources['mypath/MyContract.sol'].content, 'contract MyContractModified {}');
  t.is(buildInfoFiles[1].output.sources['mypath/MyContract.sol'].id, 456);
});

test('invalid build info', async t => {
  await fs.writeFile('build-info-invalid.json', JSON.stringify({ output: {} }));
  const error = t.throws(() => getBuildInfoFiles(['build-info-invalid.json']));
  t.true(error?.message.includes('must contain Solidity compiler input and output'));
});