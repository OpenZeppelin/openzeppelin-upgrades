const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const { defender } = require('hardhat');
const hre = require('hardhat');

const APPROVAL_PROCESS_ID = 'abc-def';
const MULTISIG_ADDRESS = '0x123';
const VIATYPE_MULTISIG = 'Multisig';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakeDefenderClient = {
    getDeployApprovalProcess: sinon.stub(),
    getUpgradeApprovalProcess: sinon.stub(),
  };

  const mockedGetApprovalProcess = proxyquire('../dist/defender/get-approval-process', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => t.context.fakeChainId,
    },
    './client': {
      getDeployClient: () => t.context.fakeDefenderClient,
    },
  });

  t.context.getDeployApprovalProcess = mockedGetApprovalProcess.makeGetDeployApprovalProcess(hre);
  t.context.getUpgradeApprovalProcess = mockedGetApprovalProcess.makeGetUpgradeApprovalProcess(hre);
  t.context.getDefaultApprovalProcess = t.context.getUpgradeApprovalProcess;
});

test.afterEach.always(() => {
  sinon.restore();
});

test('getDeployApprovalProcess', async t => {
  const { fakeChainId, fakeDefenderClient, getDeployApprovalProcess } = t.context;

  fakeDefenderClient.getDeployApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
    network: fakeChainId,
  });

  const response = await getDeployApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
  });

  sinon.assert.calledWithExactly(fakeDefenderClient.getDeployApprovalProcess, fakeChainId);
});

test('getUpgradeApprovalProcess', async t => {
  const { fakeChainId, fakeDefenderClient, getUpgradeApprovalProcess } = t.context;

  fakeDefenderClient.getUpgradeApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
    network: fakeChainId,
  });

  const response = await getUpgradeApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
  });

  sinon.assert.calledWithExactly(fakeDefenderClient.getUpgradeApprovalProcess, fakeChainId);
});

test('getDeployApprovalProcess - wrong network returned', async t => {
  const { fakeDefenderClient, getDeployApprovalProcess } = t.context;

  fakeDefenderClient.getDeployApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
    network: 'sepolia',
  });

  await t.throwsAsync(() => getDeployApprovalProcess(), {
    message: /does not match current network/,
  });
});

test('getUpgradeApprovalProcess - wrong network returned', async t => {
  const { fakeDefenderClient, getUpgradeApprovalProcess } = t.context;

  fakeDefenderClient.getUpgradeApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    via: MULTISIG_ADDRESS,
    viaType: VIATYPE_MULTISIG,
    network: 'sepolia',
  });

  await t.throwsAsync(() => getUpgradeApprovalProcess(), {
    message: /does not match current network/,
  });
});

test('getDeployApprovalProcess - no address, no viaType', async t => {
  const { fakeChainId, fakeDefenderClient, getDeployApprovalProcess } = t.context;

  fakeDefenderClient.getDeployApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    network: fakeChainId,
  });

  const response = await getDeployApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: undefined,
    viaType: undefined,
  });
});

test('getUpgradeApprovalProcess - no address, no viaType', async t => {
  const { fakeChainId, fakeDefenderClient, getUpgradeApprovalProcess } = t.context;

  fakeDefenderClient.getUpgradeApprovalProcess.returns({
    approvalProcessId: APPROVAL_PROCESS_ID,
    network: fakeChainId,
  });

  const response = await getUpgradeApprovalProcess();
  t.deepEqual(response, {
    approvalProcessId: APPROVAL_PROCESS_ID,
    address: undefined,
    viaType: undefined,
  });
});

test('getDefaultApprovalProcess is the same function as getUpgradeApprovalProcess', async t => {
  t.true(defender.getDefaultApprovalProcess === defender.getUpgradeApprovalProcess);
});
