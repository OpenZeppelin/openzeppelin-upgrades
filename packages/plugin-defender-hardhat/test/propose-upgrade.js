const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hardhat = require('hardhat');
const { ethers, upgrades } = hardhat;
const { FormatTypes } = require('ethers/lib/utils');
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
  }).makeProposeUpgrade(hardhat);

  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter);
});

test.afterEach(() => {
  sinon.restore();
});

test('proposes an upgrade', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const proposal = await proposeUpgrade(greeter.address, GreeterV2);

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('proposes an upgrade reusing prepared implementation', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const greeterV2Impl = await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  const proposal = await proposeUpgrade(greeter.address, GreeterV2);

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: greeterV2Impl,
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('fails if chain id is not accepted', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;
  t.context.fakeChainId = undefined;

  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), { message: /Network \d+ is not supported/ });
});
