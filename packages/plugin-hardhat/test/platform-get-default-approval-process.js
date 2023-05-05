const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');

const APPROVAL_PROCESS_ID = 'abc-def';
const MULTISIG_ADDRESS = '0x123';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakePlatformClient = {
    Upgrade: {
      getApprovalProcess: sinon.stub(),
    },
  };

  t.context.getDefaultApprovalProcess = proxyquire('../dist/platform/get-default-approval-process', {
    './utils': {
      ...require('../dist/platform/utils'),
      getNetwork: () => t.context.fakeChainId,
      getPlatformClient: () => t.context.fakePlatformClient,
    },
  }).makeGetDefaultApprovalProcess(hre);
});

test.afterEach.always(() => {
  sinon.restore();
});

test('get default approval process', async t => {
  const { fakeChainId, fakePlatformClient, getDefaultApprovalProcess } = t.context;

  fakePlatformClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    network: fakeChainId,
  });

  const response = await getDefaultApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: MULTISIG_ADDRESS,
  });

  sinon.assert.calledWithExactly(fakePlatformClient.Upgrade.getApprovalProcess, fakeChainId);
});

test('get default approval process - wrong network returned', async t => {
  const { fakePlatformClient, getDefaultApprovalProcess } = t.context;

  fakePlatformClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    network: 'sepolia',
  });

  await t.throwsAsync(() => getDefaultApprovalProcess(), {
    message: /does not match current network/,
  });
});

test('get default approval process - no address', async t => {
  const { fakeChainId, fakePlatformClient, getDefaultApprovalProcess } = t.context;

  fakePlatformClient.Upgrade.getApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    network: fakeChainId,
  });

  const response = await getDefaultApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: undefined,
  });
});
