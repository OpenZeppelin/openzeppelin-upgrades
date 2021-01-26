const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hardhat = require('hardhat');
const { ethers, upgrades } = hardhat;
const { FormatTypes } = require('ethers/lib/utils');
const { AdminClient } = require('defender-admin-client');

const proposalUrl = 'https://example.com';

test.before(async t => {
  const fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeClient = fakeClient;
  t.context.proposeUpgrade = proxyquire('../dist/propose-upgrade', {
    'defender-admin-client': {
      AdminClient: function () {
        return fakeClient;
      },
      '@global': true,
    },
    'defender-base-client': { fromChainId: () => 'goerli', '@global': true },
    '@global': true,
  }).makeProposeUpgrade(hardhat);

  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test.after(() => {
  sinon.restore();
});

test('proposes an upgrade', async t => {
  const { proposeUpgrade, fakeClient, Greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const greeter = await upgrades.deployProxy(Greeter);
  const proposal = await proposeUpgrade(greeter.address, GreeterV2);

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('proposes an upgrade reusing prepared implementation', async t => {
  const { proposeUpgrade, fakeClient, Greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const greeter = await upgrades.deployProxy(Greeter);
  const greeterV2Impl = await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  const proposal = await proposeUpgrade(greeter.address, GreeterV2);

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: greeterV2Impl,
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});
