const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const { AdminClient } = require('@openzeppelin/defender-admin-client');

const proposalUrl = 'https://example.com';
const multisig = '0xc0889725c22e2e36c524F41AECfddF5650432464';

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';
  t.context.proposeUpgrade = proxyquire('../dist/propose-upgrade', {
    './utils': {
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeClient,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'uups' });
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade using deployed implementation - implementation not deployed', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => proposeUpgrade(addr, GreeterV2, { multisig, useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('proposes an upgrade using deployed implementation', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const greeterV2Impl = await upgrades.deployImplementation(GreeterV2);
  const proposal = await proposeUpgrade(await greeter.getAddress(), GreeterV2, {
    multisig,
    useDeployedImplementation: true,
  });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: greeterV2Impl,
      title: undefined,
      description: undefined,
      proxyAdmin: undefined,
      via: multisig,
      viaType: undefined,
    },
    {
      address: await greeter.getAddress(),
      network: 'goerli',
      abi: GreeterV2.interface.formatJson(),
    },
  );
});
