import test from 'ava';

import { resumeOrDeploy } from './deployment';
import { stubProvider } from './stub-provider';

test('deploys new contract', async t => {
  const provider = stubProvider();
  const deployment = await resumeOrDeploy(provider, undefined, provider.deploy);
  t.truthy(deployment);
  t.is(provider.deployCount, 1);
});

test('resumes existing deployment', async t => {
  const provider = stubProvider();
  const first = await resumeOrDeploy(provider, undefined, provider.deploy);
  const second = await resumeOrDeploy(provider, first, provider.deploy);
  t.is(first, second);
  t.is(provider.deployCount, 1);
});
