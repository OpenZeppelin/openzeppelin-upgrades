const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const { AdminClient } = require('@openzeppelin/defender-admin-client');

const proposalUrl = 'https://example.com';

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';
  t.context.proposeUpgrade = proxyquire('../../dist/defender-v1/propose-upgrade', {
    './utils': {
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeClient,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterDefender');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterDefenderV2');
  t.context.greeterBeacon = await upgrades.deployBeacon(t.context.Greeter);
  t.context.greeter = await upgrades.deployBeaconProxy(t.context.greeterBeacon, t.context.Greeter);
});

test.afterEach.always(() => {
  sinon.restore();
});

// TODO change the below tests when defender.proposeUpgrade() supports beacons and beacon proxies.

test('block proposing an upgrade on beacon proxy', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2, { title, description }), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgrade()',
  });
});

test('block proposing an upgrade on beacon', async t => {
  const { proposeUpgrade, fakeClient, greeterBeacon, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const addr = await greeterBeacon.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2, { title, description }), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade on generic contract', async t => {
  const { proposeUpgrade, fakeClient, Greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const genericContract = await Greeter.deploy();

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const addr = await genericContract.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2, { title, description }), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon proxy', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV2);
  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgrade()',
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon', async t => {
  const { proposeUpgrade, fakeClient, greeterBeacon, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  await upgrades.prepareUpgrade(await greeterBeacon.getAddress(), GreeterV2);
  const addr = await greeterBeacon.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});
