const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const { AdminClient } = require('defender-admin-client');

const proposalUrl = 'https://example.com';

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';
  t.context.proposeUpgrade = proxyquire('../dist/propose-upgrade', {
    'defender-admin-client': {
      AdminClient: function () {
        return t.context.fakeClient;
      },
    },
    'defender-base-client': {
      fromChainId: () => t.context.fakeChainId,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.greeterBeacon = await upgrades.deployBeacon(t.context.Greeter);
  t.context.greeter = await upgrades.deployBeaconProxy(t.context.greeterBeacon);
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
  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2, { title, description }), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgrade()',
  });
});

test('block proposing an upgrade on beacon', async t => {
  const { proposeUpgrade, fakeClient, greeterBeacon, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  await t.throwsAsync(() => proposeUpgrade(greeterBeacon.address, GreeterV2, { title, description }), {
    message: /doesn't look like an administered ERC 1967 proxy/,
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon proxy', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgrade()',
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon', async t => {
  const { proposeUpgrade, fakeClient, greeterBeacon, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  await upgrades.prepareUpgrade(greeterBeacon.address, GreeterV2);
  await t.throwsAsync(() => proposeUpgrade(greeterBeacon.address, GreeterV2), {
    message: /doesn't look like an administered ERC 1967 proxy/,
  });
});
