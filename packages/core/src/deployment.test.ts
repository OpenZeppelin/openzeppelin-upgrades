import test from 'ava';

import { Deployment, resumeOrDeploy } from './deployment';
import { stubProvider } from './stub-provider';

test('deploys new contract', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  t.true(provider.isContract(deployment.address));
  t.is(provider.deployCount, 1);
});

test('resumes existing deployment', async t => {
  const provider = stubProvider();
  const first = await resumeOrDeploy(provider, undefined, provider.deployPending);
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
  const provider = stubProvider('0x7a69'); // Buidler EVM chainId
  const fakeDeployment: Deployment = {
    address: '0x1aec6468218510f19bb19f52c4767996895ce711',
    txHash: '0xc48e21ac9c051922f5ccf1b47b62000f567ef9bbc108d274848b44351a6872cb',
  };
  const deployment = await resumeOrDeploy(provider, fakeDeployment, provider.deploy);
  t.true(provider.isContract(deployment.address));
  t.is(provider.deployCount, 1);
});
