import _test, { TestInterface } from 'ava';
import * as ethers from 'ethers';
import bre from '@nomiclabs/buidler';
import { readArtifact } from '@nomiclabs/buidler/plugins';
import ganache from 'ganache-core';

import { Deployment, resumeOrDeploy } from './deployment';

interface Context {
  provider: ethers.providers.Web3Provider;
  deploy: Record<string, () => Promise<Deployment & { contract: ethers.Contract }>>;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const provider = new ethers.providers.Web3Provider(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ganache.provider({ blockTime: 1 }) as any,
  );
  const makeDeploy = async (contractName: string) => {
    const artifact = await readArtifact(bre.config.paths.artifacts, contractName);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, provider.getSigner());
    return async () => {
      const contract = await factory.deploy();
      const { address, deployTransaction } = contract;
      const txHash = deployTransaction.hash;
      return { address, txHash, contract };
    };
  };

  t.context.provider = provider;
  t.context.deploy = {
    DeploymentStub: await makeDeploy('DeploymentStub'),
  };
});

test('deploys new contract', async t => {
  const deployment = await resumeOrDeploy(t.context.provider, undefined, t.context.deploy.DeploymentStub);
  t.truthy(deployment);
  const answer: ethers.BigNumber = await deployment.contract.answer();
  t.is(answer.toString(), '42');
});

test('resumes existing deployment', async t => {
  const first = await resumeOrDeploy(t.context.provider, undefined, t.context.deploy.DeploymentStub);
  const second = await resumeOrDeploy(t.context.provider, first, t.context.deploy.DeploymentStub);
  t.is(first, second);
});
