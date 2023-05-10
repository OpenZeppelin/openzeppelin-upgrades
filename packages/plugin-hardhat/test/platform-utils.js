const test = require('ava');
const sinon = require('sinon');
const { getNetwork, getPlatformClient, disablePlatform, enablePlatform } = require('../dist/platform/utils');

test.beforeEach(async t => {
  t.context.fakeChainId = '0x05';
  t.context.fakeHre = {
    config: { platform: { apiKey: 'API_KEY', apiSecret: 'API_SECRET' } },
    network: {
      provider: { send: async () => t.context.fakeChainId },
      config: {},
    },
  };
});

test.afterEach.always(() => {
  sinon.restore();
});

test('returns platform network definition', async t => {
  const network = await getNetwork(t.context.fakeHre);
  t.is(network, 'goerli');
});

test('fails if chain id is not accepted', async t => {
  t.context.fakeChainId = '0x123456';
  await t.throwsAsync(() => getNetwork(t.context.fakeHre), { message: /Network \d+ is not supported/ });
});

test('fails if platform config is missing', async t => {
  delete t.context.fakeHre.config.platform;
  t.throws(() => getPlatformClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Platform API key and secret in hardhat config/,
  });
});

test('fails if platform api key is missing in config', async t => {
  delete t.context.fakeHre.config.platform.apiKey;
  t.throws(() => getPlatformClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Platform API key and secret in hardhat config/,
  });
});

test('disablePlatform - use option', async t => {
  await t.throws(() => disablePlatform(t.context.fakeHre, false, { usePlatformDeploy: true }, 'someFunc'), {
    message: /The function someFunc is not supported with the `usePlatformDeploy` option/,
  });
});

test('disablePlatform - use module', async t => {
  await t.throws(() => disablePlatform(t.context.fakeHre, true, {}, 'someFunc'), {
    message: /The function someFunc is not supported with the `platform` module/,
  });
});

test('disablePlatform - use config', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: true,
      },
    },
  };
  disablePlatform(hre, false, {}, 'someFunc'); // passes through
});

test('disablePlatform - use all', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: true,
      },
    },
  };
  await t.throws(() => disablePlatform(hre, true, { usePlatformDeploy: true }, 'someFunc'), {
    message: /The function someFunc is not supported with the `usePlatformDeploy` option/,
  });
});

test('disablePlatform - use none', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: false,
      },
    },
  };
  disablePlatform(hre, false, {}, 'someFunc'); // passes through
});

test('enablePlatform - use option', async t => {
  const result = enablePlatform(t.context.fakeHre, false, { usePlatformDeploy: true });
  t.is(result.usePlatformDeploy, true);
});

test('enablePlatform - use module', async t => {
  const result = enablePlatform(t.context.fakeHre, true, {});
  t.is(result.usePlatformDeploy, true);
});

test('enablePlatform - use config', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: true,
      },
    },
  };
  const result = enablePlatform(hre, false, {});
  t.is(result.usePlatformDeploy, true);
});

test('enablePlatform - use all', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: true,
      },
    },
  };
  const result = enablePlatform(hre, true, { usePlatformDeploy: true });
  t.is(result.usePlatformDeploy, true);
});

test('enablePlatform - use none', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: false,
      },
    },
  };
  const result = enablePlatform(hre, false, {});
  t.not(result.usePlatformDeploy, true); // not enabled
});

test('enablePlatform - option false overrides everything else', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        usePlatformDeploy: true,
      },
    },
  };
  const result = enablePlatform(hre, true, { usePlatformDeploy: false });
  t.not(result.usePlatformDeploy, true); // not enabled
});
