const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;

const proposalId = 'mocked proposal id';
const proposalUrl = 'https://example.com';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakePlatformClient = {
    Upgrade: {
      upgrade: () => {
        return {
          proposalId: proposalId,
          externalUrl: proposalUrl,
          transaction: {},
        };
      },
    },
  };

  t.context.spy = sinon.spy(t.context.fakePlatformClient.Upgrade, 'upgrade');

  t.context.proposeUpgrade = proxyquire('../dist/platform/propose-upgrade', {
    './utils': {
      ...require('../dist/platform/utils'),
      getNetwork: () => t.context.fakeChainId,
      getPlatformClient: () => t.context.fakePlatformClient,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterPlatform');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterPlatformV2');
  t.context.greeterBeacon = await upgrades.deployBeacon(t.context.Greeter);
  t.context.greeter = await upgrades.deployBeaconProxy(t.context.greeterBeacon, t.context.Greeter);
});

test.afterEach.always(() => {
  sinon.restore();
});

// TODO change the below tests when defender.proposeUpgrade() supports beacons and beacon proxies.

test('block proposing an upgrade on beacon proxy', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;

  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), {
    message: 'Beacon proxy is not currently supported with platform.proposeUpgrade()',
  });
});

test('block proposing an upgrade on beacon', async t => {
  const { proposeUpgrade, greeterBeacon, GreeterV2 } = t.context;

  await t.throwsAsync(() => proposeUpgrade(greeterBeacon.address, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade on generic contract', async t => {
  const { proposeUpgrade, Greeter, GreeterV2 } = t.context;

  const genericContract = await Greeter.deploy();

  await t.throwsAsync(() => proposeUpgrade(genericContract.address, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon proxy', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;

  await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), {
    message: 'Beacon proxy is not currently supported with platform.proposeUpgrade()',
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon', async t => {
  const { proposeUpgrade, greeterBeacon, GreeterV2 } = t.context;

  await upgrades.prepareUpgrade(greeterBeacon.address, GreeterV2);
  await t.throwsAsync(() => proposeUpgrade(greeterBeacon.address, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});
