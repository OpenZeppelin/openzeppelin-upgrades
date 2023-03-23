const test = require('ava');
const sinon = require('sinon');
const { getNetwork, getAdminClient } = require('../dist/platform/utils');

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
