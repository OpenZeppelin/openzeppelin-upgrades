const test = require('ava');
const sinon = require('sinon');
const { getNetwork, getDefenderClient, disableDefender, enableDefender } = require('../dist/defender/utils');

test.beforeEach(async t => {
  t.context.fakeChainId = '0x05';
  t.context.fakeHre = {
    config: { defender: { apiKey: 'API_KEY', apiSecret: 'API_SECRET' } },
    network: {
      provider: { send: async () => t.context.fakeChainId },
      config: {},
    },
  };
});

test.afterEach.always(() => {
  sinon.restore();
});

test('returns defender network definition', async t => {
  const network = await getNetwork(t.context.fakeHre);
  t.is(network, 'goerli');
});

test('fails if chain id is not accepted', async t => {
  t.context.fakeChainId = '0x123456';
  await t.throwsAsync(() => getNetwork(t.context.fakeHre), { message: /Network \d+ is not supported/ });
});

test('fails if defender config is missing', async t => {
  delete t.context.fakeHre.config.defender;
  t.throws(() => getDefenderClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Defender API key and secret in hardhat config/,
  });
});

test('fails if defender api key is missing in config', async t => {
  delete t.context.fakeHre.config.defender.apiKey;
  t.throws(() => getDefenderClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Defender API key and secret in hardhat config/,
  });
});

test('disableDefender - use option', async t => {
  await t.throws(() => disableDefender(t.context.fakeHre, false, { useDefenderDeploy: true }, 'someFunc'), {
    message: /The function someFunc is not supported with the `useDefenderDeploy` option/,
  });
});

test('disableDefender - use module', async t => {
  await t.throws(() => disableDefender(t.context.fakeHre, true, {}, 'someFunc'), {
    message: /The function someFunc is not supported with the `defender` module/,
  });
});

test('disableDefender - use config', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: true,
      },
    },
  };
  disableDefender(hre, false, {}, 'someFunc'); // passes through
});

test('disableDefender - use all', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: true,
      },
    },
  };
  await t.throws(() => disableDefender(hre, true, { useDefenderDeploy: true }, 'someFunc'), {
    message: /The function someFunc is not supported with the `useDefenderDeploy` option/,
  });
});

test('disableDefender - use none', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: false,
      },
    },
  };
  disableDefender(hre, false, {}, 'someFunc'); // passes through
});

test('enableDefender - use option', async t => {
  const result = enableDefender(t.context.fakeHre, false, { useDefenderDeploy: true });
  t.is(result.useDefenderDeploy, true);
});

test('enableDefender - use module', async t => {
  const result = enableDefender(t.context.fakeHre, true, {});
  t.is(result.useDefenderDeploy, true);
});

test('enableDefender - use config', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: true,
      },
    },
  };
  const result = enableDefender(hre, false, {});
  t.is(result.useDefenderDeploy, true);
});

test('enableDefender - use all', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: true,
      },
    },
  };
  const result = enableDefender(hre, true, { useDefenderDeploy: true });
  t.is(result.useDefenderDeploy, true);
});

test('enableDefender - use none', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: false,
      },
    },
  };
  const result = enableDefender(hre, false, {});
  t.not(result.useDefenderDeploy, true); // not enabled
});

test('enableDefender - option false overrides everything else', async t => {
  const hre = {
    ...t.context.fakeHre,
    config: {
      defender: {
        useDefenderDeploy: true,
      },
    },
  };
  const result = enableDefender(hre, true, { useDefenderDeploy: false });
  t.not(result.useDefenderDeploy, true); // not enabled
});
