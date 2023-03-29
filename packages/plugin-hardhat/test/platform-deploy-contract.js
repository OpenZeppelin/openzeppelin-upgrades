const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

const ADDR = '0x1';
const TX_HASH = '0x7f3d2f5323ee16badc279ea6090cb7a090e3b767843e60f693c693fe50e15c21';

test.before(async t => {
  t.context.NonUpgradeable = await ethers.getContractFactory('NonUpgradeable');
  t.context.IsInitializable = await ethers.getContractFactory('IsInitializable');
  t.context.IsInitializableUpgradeable = await ethers.getContractFactory('IsInitializableUpgradeable');
  t.context.IsUUPS = await ethers.getContractFactory('IsUUPS');
});

test.beforeEach(async t => {
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

test('deploy contract - happy path', async t => {
  const { deployContract, NonUpgradeable } = t.context;
  const addr = await deployContract(NonUpgradeable);
  t.is(addr.address, ADDR);
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
