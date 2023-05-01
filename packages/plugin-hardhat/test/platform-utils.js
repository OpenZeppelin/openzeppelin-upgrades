const test = require('ava');
const sinon = require('sinon');
const { getNetwork, getAdminClient, disablePlatform } = require('../dist/platform/utils');

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

test('returns admin client', async t => {
  const client = getAdminClient(t.context.fakeHre);
  t.is(typeof client.createProposal, 'function');
});

test('fails if platform config is missing', async t => {
  delete t.context.fakeHre.config.platform;
  t.throws(() => getAdminClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Platform API key and secret in hardhat config/,
  });
});

test('fails if platform api key is missing in config', async t => {
  delete t.context.fakeHre.config.platform.apiKey;
  t.throws(() => getAdminClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Platform API key and secret in hardhat config/,
  });
});

test('disablePlatform - use option', async t => {
  await t.throws(() => disablePlatform(t.context.fakeHre, { platform: true }, false, 'someFunc'), {
    message: /The function someFunc is not supported with the \`platform\` option/,
  });
});

test('disablePlatform - use module', async t => {
  await t.throws(() => disablePlatform(t.context.fakeHre, {}, true, 'someFunc'), {
    message: /The function someFunc is not supported with the \`platform\` module/,
  });
});

test('disablePlatform - use config', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        useDeploy: true,
      },
    },
  };
  disablePlatform(hre, {}, false, 'someFunc'); // passes through
});

test('disablePlatform - use all', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        useDeploy: true,
      },
    },
  };
  await t.throws(() => disablePlatform(hre, { platform: true }, true, 'someFunc'), {
    message: /The function someFunc is not supported with the \`platform\` option/,
  });
});

test('disablePlatform - use none', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      platform: {
        useDeploy: false,
      },
    },
  };
  disablePlatform(hre, {}, false, 'someFunc'); // passes through
});
