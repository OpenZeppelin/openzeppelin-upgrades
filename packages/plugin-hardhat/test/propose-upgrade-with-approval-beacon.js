import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import sinon from 'sinon';
import esmock from 'esmock';

let upgrades;
let defender;

const proposalId = 'mocked proposal id';
const proposalUrl = 'https://example.com';

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  defender = await defenderFactory(hre, connection);
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
    },
  });
  
  t.context.proposeUpgradeWithApproval = module.makeProposeUpgradeWithApproval(hre, true, connection);

  t.context.Greeter = await ethers.getContractFactory('GreeterDefender');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterDefenderV2');
  t.context.greeterBeacon = await upgrades.deployBeacon(t.context.Greeter);
  t.context.greeter = await upgrades.deployBeaconProxy(t.context.greeterBeacon, t.context.Greeter);
});

test.afterEach.always(() => {
  sinon.restore();
});

// TODO change the below tests when defender.proposeUpgradeWithApproval() supports beacons and beacon proxies.

test('block proposing an upgrade on beacon proxy', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgradeWithApproval()',
  });
});

test('block proposing an upgrade on beacon', async t => {
  const { proposeUpgradeWithApproval, greeterBeacon, GreeterV2 } = t.context;

  const addr = await greeterBeacon.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade on generic contract', async t => {
  const { proposeUpgradeWithApproval, Greeter, GreeterV2 } = t.context;

  const genericContract = await Greeter.deploy();

  const addr = await genericContract.getAddress();
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon proxy', async t => {
  const { proposeUpgradeWithApproval, greeter, GreeterV2 } = t.context;

  const addr = await greeter.getAddress();

  await upgrades.prepareUpgrade(addr, GreeterV2);
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: 'Beacon proxy is not currently supported with defender.proposeUpgradeWithApproval()',
  });
});

test('block proposing an upgrade reusing prepared implementation on beacon', async t => {
  const { proposeUpgradeWithApproval, greeterBeacon, GreeterV2 } = t.context;

  const addr = await greeterBeacon.getAddress();

  await upgrades.prepareUpgrade(addr, GreeterV2);
  await t.throwsAsync(() => proposeUpgradeWithApproval(addr, GreeterV2), {
    message: /Contract at \S+ doesn't look like an ERC 1967 proxy with a logic contract address/,
  });
});
