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

  t.context.Greeter = await ethers.getContractFactory('GreeterPlatformProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterPlatformV2Proxiable');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'uups' });
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade using deployed implementation - implementation not deployed', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('proposes an upgrade using deployed implementation', async t => {
  const { proposeUpgrade, spy, greeter, GreeterV2 } = t.context;

  const greeterV2Impl = await upgrades.deployImplementation(GreeterV2);
  const proposal = await proposeUpgrade(await greeter.getAddress(), GreeterV2, { useDeployedImplementation: true });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(spy, {
    proxyAddress: await greeter.getAddress(),
    proxyAdminAddress: undefined,
    newImplementationABI: GreeterV2.interface.formatJson(),
    newImplementationAddress: greeterV2Impl,
    network: 'goerli',
    approvalProcessId: undefined,
  });
});
