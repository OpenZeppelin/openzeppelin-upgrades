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

const BUILD_INFO_INDIVIDUAL_NO_LAYOUT = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
      'mypath/MyContractV2.sol': {
        content: 'contract MyContractV2 {}',
      },
    },
    settings: {
      outputSelection: {
        'mypath/MyContract.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
        },
        'mypath/MyContractV2.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
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
      'mypath/MyContractV2.sol': {
        ast: {},
        id: 456,
      },
    },
  },
};

const BUILD_INFO_INDIVIDUAL_HAS_LAYOUT = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
      'mypath/MyContractV2.sol': {
        content: 'contract MyContractV2 {}',
      },
    },
    settings: {
      outputSelection: {
        'mypath/MyContract.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata', 'storageLayout'],
        },
        'mypath/MyContractV2.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata', 'storageLayout'],
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
      'mypath/MyContractV2.sol': {
        ast: {},
        id: 456,
      },
    },
  },
};

const BUILD_INFO_PARTIAL_LAYOUT = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
      'mypath/MyContractV2.sol': {
        content: 'contract MyContractV2 {}',
      },
    },
    settings: {
      outputSelection: {
        'mypath/MyContract.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata', 'storageLayout'],
        },
        'mypath/MyContractV2.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
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
      'mypath/MyContractV2.sol': {
        ast: {},
        id: 456,
      },
    },
  },
};

const BUILD_INFO_PARTIAL_COMPILE = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
      'mypath/MyContractV2.sol': {
        content: 'contract MyContractV2 {}',
      },
    },
    settings: {
      outputSelection: {
        'mypath/MyContract.sol': {
          '': ['ast'],
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata', 'storageLayout'],
        },
        'mypath/MyContractV2.sol': {
          '': [],
          '*': [],
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
      'mypath/MyContractV2.sol': {
        ast: {},
        id: 456,
      },
    },
  },
};

const BUILD_INFO_NO_OUTPUT_SELECTION = {
  solcVersion: '0.8.9',
  input: {
    language: 'Solidity',
    sources: {
      'mypath/MyContract.sol': {
        content: 'contract MyContract {}',
      },
      'mypath/MyContractV2.sol': {
        content: 'contract MyContractV2 {}',
      },
    },
    settings: {
      outputSelection: {
        'mypath/MyContract.sol': {
          '*': [],
        },
        'mypath/MyContractV2.sol': {
          '': [],
          '*': [],
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
      'mypath/MyContractV2.sol': {
        ast: {},
        id: 456,
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

test.serial('get build info files - Foundry format success path', async t => {
  const dir = 'foundry-format-success';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    `${dir}/build-info.json`,
    JSON.stringify({
      _format: 'ethers-rs-sol-build-info-1',
      ...BUILD_INFO,
    }),
  );

  const buildInfoFiles = await getBuildInfoFiles(dir);

  t.is(buildInfoFiles.length, 1);
  t.is(buildInfoFiles[0]?.dirShortName, dir);
  t.is(buildInfoFiles[0]?.solcVersion, BUILD_INFO.solcVersion);
  t.deepEqual(buildInfoFiles[0]?.input, BUILD_INFO.input);
  t.deepEqual(buildInfoFiles[0]?.output, BUILD_INFO.output);
});

test.serial('get build info files - Hardhat 3 split format success path', async t => {
  const dir = 'hh3-format-success';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    `${dir}/solc-0_8_9-abc123.json`,
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
      input: BUILD_INFO.input,
      solcVersion: BUILD_INFO.solcVersion,
    }),
  );
  await fs.writeFile(
    `${dir}/solc-0_8_9-abc123.output.json`,
    JSON.stringify({
      output: BUILD_INFO.output,
    }),
  );

  const buildInfoFiles = await getBuildInfoFiles(dir);

  t.is(buildInfoFiles.length, 1);
  t.is(buildInfoFiles[0]?.dirShortName, dir);
  t.is(buildInfoFiles[0]?.solcVersion, BUILD_INFO.solcVersion);
  t.deepEqual(buildInfoFiles[0]?.input, BUILD_INFO.input);
  t.deepEqual(buildInfoFiles[0]?.output, BUILD_INFO.output);
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

test.serial('generic invalid build info file', async t => {
  await fs.mkdir('invalid-build-info', { recursive: true });

  await fs.writeFile('invalid-build-info/invalid.json', JSON.stringify({ output: {} }));
  const error = await t.throwsAsync(getBuildInfoFiles('invalid-build-info'));
  t.true(error?.message.includes('must include Solidity compiler input, output, and solcVersion'));
  t.true(error?.message.includes('Got format: unknown'));
});

test.serial('Foundry format (ethers-rs) with missing output suggests forge clean && forge build', async t => {
  await fs.mkdir('foundry-format-missing', { recursive: true });

  await fs.writeFile(
    'foundry-format-missing/build.json',
    JSON.stringify({
      _format: 'ethers-rs-sol-build-info-1',
      input: BUILD_INFO.input,
      solcVersion: '0.8.31',
      // output missing
    }),
  );
  const error = await t.throwsAsync(getBuildInfoFiles('foundry-format-missing'));
  t.true(error?.message.includes('must contain Solidity compiler input, output, and solcVersion'));
  t.true(error?.message.includes('ethers-rs-sol-build-info'));
  t.true(error?.message.includes('forge clean && forge build'));
});

test.serial('Hardhat 3 format with missing input and solcVersion suggests hardhat compile', async t => {
  await fs.mkdir('hh3-format-missing-input', { recursive: true });

  await fs.writeFile(
    'hh3-format-missing-input/solc-0_8_0-abc123.json',
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
    }),
  );
  const error = await t.throwsAsync(getBuildInfoFiles('hh3-format-missing-input'));
  t.true(error?.message.includes('Hardhat 3 format'));
  t.true(error?.message.includes('must contain input and solcVersion'));
  t.true(error?.message.includes('hardhat compile'));
});

test.serial('Hardhat 3 format with missing .output.json suggests hardhat compile', async t => {
  await fs.mkdir('hh3-format-missing-output', { recursive: true });

  await fs.writeFile(
    'hh3-format-missing-output/solc-0_8_0-abc123.json',
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
      input: BUILD_INFO.input,
      solcVersion: '0.8.9',
      // output in separate .output.json which we do not create
    }),
  );
  const error = await t.throwsAsync(getBuildInfoFiles('hh3-format-missing-output'));
  t.true(error?.message.includes('could not be read'));
  t.false(error?.message.includes('missing Solidity compiler output'));
  t.true(error?.message.includes('Hardhat 3'));
  t.true(error?.message.includes('hardhat compile'));
});

test.serial('Hardhat 3 format with empty .output.json reports missing compiler output', async t => {
  await fs.mkdir('hh3-format-empty-output', { recursive: true });

  await fs.writeFile(
    'hh3-format-empty-output/solc-0_8_0-abc123.json',
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
      input: BUILD_INFO.input,
      solcVersion: '0.8.9',
    }),
  );
  await fs.writeFile('hh3-format-empty-output/solc-0_8_0-abc123.output.json', JSON.stringify({}));

  const error = await t.throwsAsync(getBuildInfoFiles('hh3-format-empty-output'));
  t.true(error?.message.includes('missing Solidity compiler output'));
  t.false(error?.message.includes('could not be read'));
  t.true(error?.message.includes('Hardhat 3'));
  t.true(error?.message.includes('hardhat compile'));
});

test.serial('Hardhat 2 format with missing output falls back to generic help', async t => {
  await fs.mkdir('invalid-hh2-build-info', { recursive: true });

  // Missing output but has an hh2-style _format with input and solcVersion.
  await fs.writeFile(
    'invalid-hh2-build-info/invalid.json',
    JSON.stringify({
      _format: 'hh-sol-build-info-1',
      input: BUILD_INFO.input,
      solcVersion: '0.8.9',
      // output missing
    }),
  );

  const error = await t.throwsAsync(getBuildInfoFiles('invalid-hh2-build-info'));
  t.true(error?.message.includes('must include Solidity compiler input, output, and solcVersion'));
  t.true(error?.message.includes('invalid.json'));
  t.false(error?.message.includes('Hardhat 3'));
});

test.serial('dir does not exist', async t => {
  const error = await t.throwsAsync(getBuildInfoFiles('invalid-dir'));
  t.true(error?.message.includes('does not exist'));
});

test.serial('no build info files', async t => {
  const dir = 'empty-dir';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/notjson.txt`, 'abc');

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('does not contain any build info files'));
});

test.serial('no storage layout', async t => {
  const dir = 'no-storage-layout';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_NO_LAYOUT));

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('does not contain storage layout'));
});

test.serial('individual output selections - no layout', async t => {
  const dir = 'individual-no-layout';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_INDIVIDUAL_NO_LAYOUT));

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('does not contain storage layout'));
});

test.serial('individual output selections - has layout', async t => {
  const dir = 'individual-has-layout';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_INDIVIDUAL_HAS_LAYOUT));

  t.assert((await getBuildInfoFiles(dir)).length === 1);
});

test.serial('individual output selections - partial layout', async t => {
  const dir = 'partial-layout';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_PARTIAL_LAYOUT));

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('does not contain storage layout'));
});

test.serial('individual output selections - partial compile', async t => {
  const dir = 'partial-compile';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_PARTIAL_COMPILE));

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('is not from a full compilation'));
});

test.serial('no output selection', async t => {
  const dir = 'no-output';

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/build-info.json`, JSON.stringify(BUILD_INFO_NO_OUTPUT_SELECTION));

  const error = await t.throwsAsync(getBuildInfoFiles(dir));
  t.true(error?.message.includes('is not from a full compilation'));
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
