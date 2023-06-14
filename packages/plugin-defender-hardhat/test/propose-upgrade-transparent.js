const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const { FormatTypes } = require('ethers/lib/utils');
const { AdminClient } = require('@openzeppelin/defender-admin-client');

const proposalUrl = 'https://example.com';

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';
  t.context.proposeUpgrade = proxyquire('../dist/propose-upgrade', {
    './utils': {
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeClient,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'transparent' });
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const proposal = await proposeUpgrade(greeter.address, GreeterV2, { title, description });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
      title,
      description,
      proxyAdmin: undefined,
      via: undefined,
      viaType: undefined,
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
      title: undefined,
      description: undefined,
      proxyAdmin: undefined,
      via: undefined,
      viaType: undefined,
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});
