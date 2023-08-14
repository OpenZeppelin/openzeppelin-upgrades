const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');

const APPROVAL_PROCESS_ID = 'abc-def';
const MULTISIG_ADDRESS = '0x123';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakeDefenderClient = {
    Upgrade: {
      getApprovalProcess: sinon.stub(),
    },
  };

  t.context.getDefaultApprovalProcess = proxyquire('../dist/defender/get-default-approval-process', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => t.context.fakeChainId,
      getDefenderClient: () => t.context.fakeDefenderClient,
    },
  }).makeGetDefaultApprovalProcess(hre);
});

test.afterEach.always(() => {
  sinon.restore();
});

test('get default approval process', async t => {
  const { fakeChainId, fakeDefenderClient, getDefaultApprovalProcess } = t.context;

  fakeDefenderClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    network: fakeChainId,
  });

  const response = await getDefaultApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: MULTISIG_ADDRESS,
  });

  sinon.assert.calledWithExactly(fakeDefenderClient.Upgrade.getApprovalProcess, fakeChainId);
});

test('get default approval process - wrong network returned', async t => {
  const { fakeDefenderClient, getDefaultApprovalProcess } = t.context;

  fakeDefenderClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    network: 'sepolia',
  });

  await t.throwsAsync(() => getDefaultApprovalProcess(), {
    message: /does not match current network/,
  });
});

test('get default approval process - no address', async t => {
  const { fakeChainId, fakeDefenderClient, getDefaultApprovalProcess } = t.context;

  fakeDefenderClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    network: fakeChainId,
  });

  const response = await getDefaultApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: undefined,
  });
});
