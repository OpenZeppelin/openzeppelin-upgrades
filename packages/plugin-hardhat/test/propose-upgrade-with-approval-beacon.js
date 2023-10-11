const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;

const proposalId = 'mocked proposal id';
const proposalUrl = 'https://example.com';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakeDefenderClient = {
    upgradeContract: () => {
      return {
        proposalId: proposalId,
        externalUrl: proposalUrl,
        transaction: {},
      };
    },
  };

  t.context.spy = sinon.spy(t.context.fakeDefenderClient, 'upgradeContract');

  t.context.proposeUpgradeWithApproval = proxyquire('../dist/defender/propose-upgrade-with-approval', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => t.context.fakeChainId,
      getDeployClient: () => t.context.fakeDefenderClient,
    },
  }).makeProposeUpgradeWithApproval(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterDefender');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterDefenderV2');
  t.context.greeterBeacon = await upgrades.deployBeacon(t.context.Greeter);
  t.context.greeter = await upgrades.deployBeaconProxy(t.context.greeterBeacon, t.context.Greeter);
});

test.afterEach.always(() => {
  sinon.restore();
});

// TODO change the below tests when defender.proposeUpgradeWithApproval() supports beacons and beacon proxies.

test('block proposing an upgrade on beacon proxy', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgradeWithApproval()',
  });
});

test('block proposing an upgrade on beacon', async t => {
  const { proposeUpgradeWithApproval, greeterBeacon, GreeterV2 } = t.context;

  const addr = await greeterBeacon.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade on generic contract', async t => {
  const { proposeUpgradeWithApproval, Greeter, GreeterV2 } = t.context;

  const genericContract = await Greeter.deploy();

  const addr = await genericContract.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon proxy', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();

  await upgrades.prepareUpgrade(addr, GreeterV2);
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgradeWithApproval()',
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon', async t => {
  const { proposeUpgradeWithApproval, greeterBeacon, GreeterV2 } = t.context;

  const addr = await greeterBeacon.getAddress();

  await upgrades.prepareUpgrade(addr, GreeterV2);
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});
