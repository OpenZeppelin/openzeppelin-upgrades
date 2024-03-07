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
    },
    './client': {
      getDeployClient: () => t.context.fakeDefenderClient,
    },
  }).makeProposeUpgradeWithApproval(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterDefenderProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterDefenderV2Proxiable');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'uups' });
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade using deployed implementation - implementation not deployed', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('proposes an upgrade using deployed implementation', async t => {
  const { proposeUpgradeWithApproval, spy, greeter, GreeterV2 } = t.context;

  const greeterV2Impl = await upgrades.deployImplementation(GreeterV2);
  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2, {
    useDeployedImplementation: true,
  });

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
