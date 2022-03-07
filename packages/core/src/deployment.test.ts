import test from 'ava';
import { promisify } from 'util';
import { TransactionMinedTimeout } from '.';

import { Deployment, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import { stubProvider } from './stub-provider';

const sleep = promisify(setTimeout);

test('deploys new contract', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  t.true(provider.isContract(deployment.address));
  t.is(provider.deployCount, 1);
});

test('resumes existing deployment with txHash', async t => {
  const provider = stubProvider();
  const first = await resumeOrDeploy(provider, undefined, provider.deployPending);
  const second = await resumeOrDeploy(provider, first, provider.deployPending);
  t.is(first, second);
  t.is(provider.deployCount, 1);
});

test('resumes existing deployment without txHash', async t => {
  const provider = stubProvider();
  const first = await provider.deploy();
  delete first.txHash;
  const second = await resumeOrDeploy(provider, first, provider.deployPending);
  t.is(first, second);
  t.is(provider.deployCount, 1);
});

test('errors if tx is not found', async t => {
  const provider = stubProvider();
  const fakeDeployment: Deployment = {
    address: '0x1aec6468218510f19bb19f52c4767996895ce711',
    txHash: '0xc48e21ac9c051922f5ccf1b47b62000f567ef9bbc108d274848b44351a6872cb',
  };
  await t.throwsAsync(resumeOrDeploy(provider, fakeDeployment, provider.deploy));
});

test('redeploys if tx is not found on dev network', async t => {
  // 31337 = Hardhat Network chainId
  const provider = stubProvider(31337, 'HardhatNetwork/2.2.1/@ethereumjs/vm/5.3.2');
  const fakeDeployment: Deployment = {
    address: '0x1aec6468218510f19bb19f52c4767996895ce711',
    txHash: '0xc48e21ac9c051922f5ccf1b47b62000f567ef9bbc108d274848b44351a6872cb',
  };
  const deployment = await resumeOrDeploy(provider, fakeDeployment, provider.deploy);
  t.true(provider.isContract(deployment.address));
  t.is(provider.deployCount, 1);
});

test('validates a mined deployment with txHash', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  await waitAndValidateDeployment(provider, deployment);
  t.is(provider.getMethodCount('eth_getTransactionReceipt'), 1);
  t.is(provider.getMethodCount('eth_getCode'), 1);
});

test('validates a mined deployment without txHash', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  delete deployment.txHash;
  await waitAndValidateDeployment(provider, deployment);
  t.is(provider.getMethodCount('eth_getTransactionReceipt'), 0);
  t.is(provider.getMethodCount('eth_getCode'), 1);
});

test('waits for a deployment to mine', async t => {
  const timeout = Symbol('timeout');
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deployPending);
  const result = await Promise.race([waitAndValidateDeployment(provider, deployment), sleep(100).then(() => timeout)]);
  t.is(result, timeout);
  provider.mine();
  await waitAndValidateDeployment(provider, deployment);
});

test('fails deployment fast if tx reverts', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  provider.failTx(deployment.txHash!);
  await t.throwsAsync(waitAndValidateDeployment(provider, deployment));
});

test('waits for a deployment to return contract code', async t => {
  const timeout = Symbol('timeout');
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  provider.removeContract(deployment.address);
  const result = await Promise.race([waitAndValidateDeployment(provider, deployment), sleep(100).then(() => timeout)]);
  t.is(result, timeout);
  provider.addContract(deployment.address);
  await waitAndValidateDeployment(provider, deployment);
});

test('tx mined timeout - no params', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  try {
    throw new TransactionMinedTimeout(deployment);
  } catch (e: any) {
    const EXPECTED =
      /Timed out waiting for contract deployment to address \S+ with transaction \S+\n\nRun the function again to continue waiting for the transaction confirmation./;
    t.true(EXPECTED.test(e.message), e.message);
  }
});

test('tx mined timeout - params', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  try {
    throw new TransactionMinedTimeout(deployment, 'implementation', true);
  } catch (e: any) {
    const EXPECTED =
      /Timed out waiting for implementation contract deployment to address \S+ with transaction \S+\n\nRun the function again to continue waiting for the transaction confirmation. If the problem persists, adjust the polling parameters with the timeout and pollingInterval options./;
    t.true(EXPECTED.test(e.message), e.message);
  }
});
