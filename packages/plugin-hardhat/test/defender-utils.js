const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { disableDefender, enableDefender } = require('../dist/defender/utils');
const { getDeployClient } = require('../dist/defender/client');

test.beforeEach(async t => {
  t.context.fakeChainId = '0x01';
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

test('getNetwork finds network', async t => {
  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const network = await utils.getNetwork(t.context.fakeHre);
  t.is(network, 'mainnet');
});

test('getNetwork cannot find network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  await t.throwsAsync(() => utils.getNetwork(t.context.fakeHre), {
    message: /The current network with chainId \d+ is not supported/,
  });
});

test('getNetworks finds forked network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [
        {
          chainId: 0x222222,
          name: 'other-forked-network',
        },
        {
          chainId: 0x123456,
          name: 'my-forked-network',
        },
      ];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const network = await utils.getNetwork(t.context.fakeHre);
  t.is(network, 'my-forked-network');
});

test('getNetwork finds private network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [];
    },
    listPrivateNetworks: () => {
      return [
        {
          chainId: 0x123456,
          name: 'my-private-network',
        },
      ];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const network = await utils.getNetwork(t.context.fakeHre);
  t.is(network, 'my-private-network');
});

test('getNetworks finds multiple networks', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [
        {
          chainId: 0x123456,
          name: 'first-forked-network',
        },
        {
          chainId: 0x123456,
          name: 'second-forked-network',
        },
      ];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  await t.throwsAsync(() => utils.getNetwork(t.context.fakeHre), {
    message:
      /Detected multiple networks with the same chainId \d+ on OpenZeppelin Defender: first-forked-network, second-forked-network/,
  });
});

test('getNetworks finds one network, does not match specified network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [
        {
          chainId: 0x123456,
          name: 'my-forked-network',
        },
      ];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const hreWithDefenderNetwork = {
    config: { defender: { apiKey: 'API_KEY', apiSecret: 'API_SECRET', network: 'specified-network' } },
    network: {
      provider: { send: async () => t.context.fakeChainId },
      config: {},
    },
  };

  await t.throwsAsync(() => utils.getNetwork(hreWithDefenderNetwork), {
    message: /Detected network my-forked-network does not match specified network: specified-network/,
  });
});

test('getNetworks finds multiple network, does not match specified network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [
        {
          chainId: 0x123456,
          name: 'my-forked-network',
        },
        {
          chainId: 0x123456,
          name: 'my-forked-network-2',
        },
      ];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const hreWithDefenderNetwork = {
    config: { defender: { apiKey: 'API_KEY', apiSecret: 'API_SECRET', network: 'specified-network' } },
    network: {
      provider: { send: async () => t.context.fakeChainId },
      config: {},
    },
  };

  await t.throwsAsync(() => utils.getNetwork(hreWithDefenderNetwork), {
    message:
      /Specified network specified-network does not match any of the detected networks for chainId 1193046: my-forked-network, my-forked-network-2/,
  });
});

test('getNetworks finds multiple networks, includes specified network', async t => {
  t.context.fakeChainId = '0x123456';

  const fakeNetworkClient = {
    listForkedNetworks: () => {
      return [
        {
          chainId: 0x123456,
          name: 'my-forked-network',
        },
        {
          chainId: 0x123456,
          name: 'specified-network',
        },
      ];
    },
    listPrivateNetworks: () => {
      return [];
    },
  };

  const utils = proxyquire('../dist/defender/utils', {
    './client': {
      getNetworkClient: () => fakeNetworkClient,
    },
  });

  const hreWithDefenderNetwork = {
    config: { defender: { apiKey: 'API_KEY', apiSecret: 'API_SECRET', network: 'specified-network' } },
    network: {
      provider: { send: async () => t.context.fakeChainId },
      config: {},
    },
  };

  const network = await utils.getNetwork(hreWithDefenderNetwork);
  t.is(network, 'specified-network');
});

test('fails if defender config is missing', async t => {
  delete t.context.fakeHre.config.defender;
  t.throws(() => getDeployClient(t.context.fakeHre), {
    message: /Missing OpenZeppelin Defender API key and secret in hardhat config/,
  });
});

test('fails if defender api key is missing in config', async t => {
  delete t.context.fakeHre.config.defender.apiKey;
  t.throws(() => getDeployClient(t.context.fakeHre), {
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
