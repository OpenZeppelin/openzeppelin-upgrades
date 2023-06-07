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

test('get build info files - default', async t => {
  await fs.mkdir('artifacts/build-info', { recursive: true });

  await fs.writeFile('artifacts/build-info/build-info.json', JSON.stringify(BUILD_INFO));
  await fs.writeFile('artifacts/build-info/build-info-2.json', JSON.stringify(BUILD_INFO_2));

  const buildInfoFiles = await getBuildInfoFiles(); // uses default
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
});

test('invalid build info file', async t => {
  await fs.mkdir('invalid-build-info', { recursive: true });

  await fs.writeFile('invalid-build-info/invalid.json', JSON.stringify({ output: {} }));
  const error = await t.throwsAsync(getBuildInfoFiles('invalid-build-info'));
  t.true(error?.message.includes('must contain Solidity compiler input and output'));
});
