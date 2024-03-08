const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;

const proposalId = 'mocked proposal id';
const proposalUrl = 'https://example.com';

const approvalProcessId = '123';

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
  t.context.GreeterTransparent = await ethers.getContractFactory('Greeter');
  t.context.GreeterTransparentV2 = await ethers.getContractFactory('GreeterV2');
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade and get tx response', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2);
  t.is(proposal.url, proposalUrl);

  t.not(proposal.txResponse.hash, undefined);
  const txReceipt = await proposal.txResponse.wait();
  t.not(txReceipt.contractAddress, undefined);

  const proposal2 = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2);

  // even though impl was already deployed in first proposal, it should still provide a tx response for the same tx hash
  t.is(proposal2.txResponse.hash, proposal.txResponse.hash);
  const txReceipt2 = await proposal.txResponse.wait();
  t.is(txReceipt2.contractAddress, txReceipt.contractAddress);
});

test('proposes an upgrade', async t => {
  const { proposeUpgradeWithApproval, spy, greeter, GreeterV2 } = t.context;

  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2);

  t.is(proposal.url, proposalUrl);
  t.is(proposal.proposalId, proposalId);
  sinon.assert.calledWithExactly(spy, {
    proxyAddress: await greeter.getAddress(),
    proxyAdminAddress: undefined,
    newImplementationABI: GreeterV2.interface.formatJson(),
    newImplementationAddress: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
    network: 'goerli',
    approvalProcessId: undefined,
  });
});

test('proposes an upgrade with approvalProcessId', async t => {
  const { proposeUpgradeWithApproval, spy, greeter, GreeterV2 } = t.context;

  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2, { approvalProcessId });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(spy, {
    proxyAddress: await greeter.getAddress(),
    proxyAdminAddress: undefined,
    newImplementationABI: GreeterV2.interface.formatJson(),
    newImplementationAddress: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
    network: 'goerli',
    approvalProcessId,
  });
});

test('proposes an upgrade reusing prepared implementation', async t => {
  const { proposeUpgradeWithApproval, spy, greeter, GreeterV2 } = t.context;

  const greeterV2Impl = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV2);
  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2);

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
