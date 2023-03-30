const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();
const { getContractAddress } = require('ethers/lib/utils');

const hre = require('hardhat');
const { ethers } = hre;

const ADDR = '0x1';
const TX_HASH = '0x0000000000000000000000000000000000000000000000000000000000000002';

test.before(async t => {
  t.context.NonUpgradeable = await ethers.getContractFactory('NonUpgradeable');
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
  t.context.IsInitializable = await ethers.getContractFactory('IsInitializable');
  t.context.IsInitializableUpgradeable = await ethers.getContractFactory('IsInitializableUpgradeable');
  t.context.IsUUPS = await ethers.getContractFactory('IsUUPS');

  t.context.deployContract = proxyquire('../dist/deploy-contract', {
    './platform/deploy': {
      platformDeploy: async () => {
        return {
          address: ADDR,
          txHash: TX_HASH,
          deployTransaction: undefined,
          deploymentId: 'abc',
        };
      },
      '@global': true,
    },
  }).makeDeployContract(hre, true);
});

test('deploy contract', async t => {
  const { deployContract, NonUpgradeable } = t.context;
  const inst = await deployContract(NonUpgradeable);
  t.is(inst.address, ADDR);
});

test('deploy contract - platform false', async t => {
  const { deployContract, NonUpgradeable } = t.context;
  const error = await t.throwsAsync(() => deployContract(NonUpgradeable, { platform: false }));
  t.regex(error.message, /The deployContract function can only be used with the `platform` module or option/);
});

test('deploy contract - constructor', async t => {
  const { deployContract, WithConstructor } = t.context;
  const inst = await deployContract(WithConstructor, [10]);
  t.is(inst.address, ADDR);
});

test('deploy contract - constructor using opts', async t => {
  const { deployContract, WithConstructor } = t.context;

  const error = await t.throwsAsync(() => deployContract(WithConstructor, { constructorArgs: [10] }));
  t.regex(error.message, /The deployContract function does not support the constructorArgs option/);
});

test('deploy contract - constructor using args and opts', async t => {
  const { deployContract, WithConstructor } = t.context;

  const error = await t.throwsAsync(() => deployContract(WithConstructor, [5], { constructorArgs: [10] }));
  t.regex(error.message, /The deployContract function does not support the constructorArgs option/);
});

test('deploy contract - is initializable', async t => {
  const { deployContract, IsInitializable } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsInitializable));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - is initializable upgradeable', async t => {
  const { deployContract, IsInitializableUpgradeable } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsInitializableUpgradeable));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - is uups', async t => {
  const { deployContract, IsUUPS } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsUUPS));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - allow unsafe', async t => {
  const { deployContract, IsUUPS } = t.context;
  const inst = await deployContract(IsUUPS, { unsafeAllowDeployContract: true });
  t.is(inst.address, ADDR);
});

test('await deployed contract', async t => {
  const { NonUpgradeable } = t.context;

  const precreated = await NonUpgradeable.deploy();

  const deployContract = proxyquire('../dist/deploy-contract', {
    './platform/deploy': {
      platformDeploy: async () => {
        return {
          address: precreated.address,
          txHash: precreated.txHash,
          deployTransaction: precreated.deployTransaction,
          deploymentId: 'abc',
        };
      },
      '@global': true,
    },
  }).makeDeployContract(hre, true);

  const inst = await deployContract(NonUpgradeable);
  t.is(inst.address, precreated.address);
  await inst.deployed();
});

test('await replaced transaction', async t => {
  const { NonUpgradeable } = t.context;

  const nonce = await hre.ethers.provider.getTransactionCount(await NonUpgradeable.signer.getAddress());
  const counterFactualAddress = getContractAddress({
    from: await NonUpgradeable.signer.getAddress(),
    nonce: nonce,
  });

  // const precreated = await NonUpgradeable.deploy();
  // console.log("pre " + precreated.address);

  const deployContract = proxyquire('../dist/deploy-contract', {
    './platform/deploy': {
      platformDeploy: async () => {
        return {
          address: counterFactualAddress,
          txHash: TX_HASH,
          deployTransaction: undefined,
          deploymentId: 'abc',
        };
      },
      '@global': true,
    },
  }).makeDeployContract(hre, true);

  const inst = await deployContract(NonUpgradeable);
  t.is(inst.address, counterFactualAddress);
  // await inst.deployed(); // TODO stub

});
