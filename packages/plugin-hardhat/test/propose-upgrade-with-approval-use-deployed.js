import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import sinon from 'sinon';
import esmock from 'esmock';
import { mockDeploy } from './defender-utils.js';

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