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
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterPlatformV2Bad');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'transparent' });
  t.context.proxyAdmin = await upgrades.erc1967.getAdminAddress(await t.context.greeter.getAddress());
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade', async t => {
  const { proposeUpgrade, spy, proxyAdmin, greeter, GreeterV2 } = t.context;

  const proposal = await proposeUpgrade(await greeter.getAddress(), GreeterV2, {
    unsafeAllow: ['delegatecall'],
  });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(spy, {
    proxyAddress: await greeter.getAddress(),
    proxyAdminAddress: proxyAdmin,
    newImplementationABI: GreeterV2.interface.formatJson(),
    newImplementationAddress: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
    network: 'goerli',
    approvalProcessId: undefined,
  });
});
