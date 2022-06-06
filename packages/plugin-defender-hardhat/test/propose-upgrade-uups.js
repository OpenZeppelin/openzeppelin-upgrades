const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const { FormatTypes } = require('ethers/lib/utils');
const { AdminClient } = require('defender-admin-client');

const proposalUrl = 'https://example.com';
const multisig = '0xc0889725c22e2e36c524F41AECfddF5650432464';

test.beforeEach(async t => {
  t.context.fakeClient = sinon.createStubInstance(AdminClient);
  t.context.fakeChainId = 'goerli';
  t.context.proposeUpgrade = proxyquire('../dist/propose-upgrade', {
    'defender-admin-client': {
      AdminClient: function () {
        return t.context.fakeClient;
      },
    },
    'defender-base-client': {
      fromChainId: () => t.context.fakeChainId,
    },
  }).makeProposeUpgrade(hre);

  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.greeter = await upgrades.deployProxy(t.context.Greeter, { kind: 'uups' });
});

test.afterEach.always(() => {
  sinon.restore();
});

test('proposes an upgrade and get tx response', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const proposal = await proposeUpgrade(greeter.address, GreeterV2, { title, description, multisig });

  t.is(proposal.url, proposalUrl);

  t.not(proposal.txResponse.hash, undefined);
  const txReceipt = await proposal.txResponse.wait();
  t.not(txReceipt.contractAddress, undefined);

  const proposal2 = await proposeUpgrade(greeter.address, GreeterV2, { title, description, multisig });

  // even though impl was already deployed in first proposal, it should still provide a tx response for the same tx hash
  t.is(proposal2.txResponse.hash, proposal.txResponse.hash);
  const txReceipt2 = await proposal.txResponse.wait();
  t.is(txReceipt2.contractAddress, txReceipt.contractAddress);
});

test('proposes an upgrade', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const proposal = await proposeUpgrade(greeter.address, GreeterV2, { title, description, multisig });

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
      title,
      description,
      proxyAdmin: undefined,
      via: multisig,
      viaType: undefined,
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('proposes an upgrade with explicit multisig and proxy admin', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const title = 'My upgrade';
  const description = 'My contract upgrade';
  const proxyAdmin = '0x20cE6FeEf8862CbCe65fd1cafA59ac8bbC77e445';
  const multisigType = 'Gnosis Safe';
  const opts = { title, description, proxyAdmin, multisig, multisigType };
  const proposal = await proposeUpgrade(greeter.address, GreeterV2, opts);

  t.is(proposal.url, proposalUrl);
  sinon.assert.calledWithExactly(
    fakeClient.proposeUpgrade,
    {
      newImplementation: sinon.match(/^0x[A-Fa-f0-9]{40}$/),
      title,
      description,
      proxyAdmin,
      via: multisig,
      viaType: multisigType,
    },
    {
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('proposes an upgrade reusing prepared implementation', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  fakeClient.proposeUpgrade.resolves({ url: proposalUrl });

  const greeterV2Impl = await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  const proposal = await proposeUpgrade(greeter.address, GreeterV2, { multisig });

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
      address: greeter.address,
      network: 'goerli',
      abi: GreeterV2.interface.format(FormatTypes.json),
    },
  );
});

test('fails if chain id is not accepted', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;
  t.context.fakeChainId = undefined;

  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), { message: /Network \d+ is not supported/ });
});

test('fails if defender config is missing', async t => {
  const { proposeUpgrade, greeter, GreeterV2 } = t.context;
  const { defender } = hre.config;
  delete hre.config.defender;

  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), {
    message: 'Missing Defender API key and secret in hardhat config',
  });
  hre.config.defender = defender;
});

test('fails if multisig address is missing from UUPS proxy', async t => {
  const { proposeUpgrade, fakeClient, greeter, GreeterV2 } = t.context;
  sinon.assert.notCalled(fakeClient.proposeUpgrade);
  await t.throwsAsync(() => proposeUpgrade(greeter.address, GreeterV2), {
    message: 'Multisig address is a required property for UUPS proxies',
  });
});
