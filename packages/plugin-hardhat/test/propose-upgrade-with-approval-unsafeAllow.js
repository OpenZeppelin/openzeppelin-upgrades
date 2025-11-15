import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import sinon from 'sinon';
import esmock from 'esmock';
import { mockDeploy } from '../dist/test-utils/mock-deploy.js';

let upgrades;

const proposalId = 'mocked proposal id';
const proposalUrl = 'https://example.com';

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

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

  const { getNetwork: _getNetwork, ...otherDefenderUtils } = await import('../dist/defender/utils.js');
  const module = await esmock('../dist/defender/propose-upgrade-with-approval.js', {
    '../dist/defender/utils.js': {
      ...otherDefenderUtils,
      getNetwork: () => t.context.fakeChainId,
    },
    '../dist/defender/client.js': {
      getDeployClient: () => t.context.fakeDefenderClient,
      getNetworkClient: () => t.context.fakeDefenderClient,
    },
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  }, {
    // Global mocks
    '../dist/defender/client.js': {
      getDeployClient: () => t.context.fakeDefenderClient,
      getNetworkClient: () => t.context.fakeDefenderClient,
    },
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  });
  
  t.context.proposeUpgradeWithApproval = module.makeProposeUpgradeWithApproval(hre, true, connection);

  t.context.Greeter = await ethers.getContractFactory('GreeterDefender');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterDefenderV2Bad');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'transparent' });
  t.context.proxyAdmin = await upgrades.erc1967.getAdminAddress(await t.context.greeter.getAddress());
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade', async t => {
  const { proposeUpgradeWithApproval, spy, proxyAdmin, greeter, GreeterV2 } = t.context;

  const proposal = await proposeUpgradeWithApproval(await greeter.getAddress(), GreeterV2, {
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