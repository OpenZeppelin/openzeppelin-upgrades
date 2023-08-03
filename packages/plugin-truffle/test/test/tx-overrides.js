const assert = require('assert');

// ignore eslint error for injected web3
/* global web3 */

const {
  deployProxy,
  upgradeProxy,
  deployBeacon,
  upgradeBeacon,
  deployBeaconProxy,
  deployImplementation,
  prepareUpgrade,
  admin,
  deployProxyAdmin,
} = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

async function assertGasLimit(oldBlockNumber, expectedGasLimit, minExpectedBlocks) {
  const newBlockNumber = await web3.eth.getBlockNumber();
  assert(
    newBlockNumber - oldBlockNumber >= minExpectedBlocks,
    `Actual number of blocks ${newBlockNumber - oldBlockNumber}, expected at least ${minExpectedBlocks}`,
  );

  for (let i = oldBlockNumber + 1; i <= newBlockNumber; i++) {
    const block = await web3.eth.getBlock(i);
    assert.equal(block.transactions.length, 1); // Assume and assert that tests run with only one tx per block
    const txHash = block.transactions[0];

    const tx = await web3.eth.getTransaction(txHash);
    assert.equal(tx.gas, expectedGasLimit);
  }
}

contract('Transaction overrides', function () {
  it('deployProxy', async function () {
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await deployProxy(Greeter, ['Hello'], {
      redeployImplementation: 'always',
      txOverrides: { gas: 10000001 },
    });

    await assertGasLimit(oldBlockNumber, 10000001, 2);
  });

  it('upgradeProxy', async function () {
    const greeter = await deployProxy(Greeter, ['Hello']);
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await upgradeProxy(greeter, GreeterV2, {
      redeployImplementation: 'always',
      txOverrides: { gas: 10000002 },
    });

    await assertGasLimit(oldBlockNumber, 10000002, 2);
  });

  it('deployBeacon', async function () {
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await deployBeacon(Greeter, { redeployImplementation: 'always', txOverrides: { gas: 10000003 } });

    await assertGasLimit(oldBlockNumber, 10000003, 2);
  });

  it('upgradeBeacon', async function () {
    const greeter = await deployBeacon(Greeter);
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await upgradeBeacon(greeter, GreeterV2, { redeployImplementation: 'always', txOverrides: { gas: 10000004 } });

    await assertGasLimit(oldBlockNumber, 10000004, 2);
  });

  it('deployBeaconProxy', async function () {
    const beacon = await deployBeacon(Greeter);

    const oldBlockNumber = await web3.eth.getBlockNumber();

    await deployBeaconProxy(beacon, Greeter, ['Hello'], { txOverrides: { gas: 10000005 } });

    await assertGasLimit(oldBlockNumber, 10000005, 1);
  });

  it('deployImplementation', async function () {
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await deployImplementation(Greeter, { redeployImplementation: 'always', txOverrides: { gas: 10000006 } });

    await assertGasLimit(oldBlockNumber, 10000006, 1);
  });

  it('prepareUpgrade', async function () {
    const greeter = await deployProxy(Greeter, ['Hello']);
    const oldBlockNumber = await web3.eth.getBlockNumber();

    await prepareUpgrade(greeter, GreeterV2, { redeployImplementation: 'always', txOverrides: { gas: 10000007 } });

    await assertGasLimit(oldBlockNumber, 10000007, 1);
  });

  it('changeProxyAdmin', async function () {
    const greeter = await deployProxy(Greeter, ['Hello']);
    const oldBlockNumber = await web3.eth.getBlockNumber();

    const accounts = await web3.eth.getAccounts();

    await admin.changeProxyAdmin(greeter.address, accounts[1], { txOverrides: { gas: 10000008 } });

    await assertGasLimit(oldBlockNumber, 10000008, 1);
  });

  it('transferProxyAdminOwnership', async function () {
    await deployProxyAdmin();
    const oldBlockNumber = await web3.eth.getBlockNumber();

    const accounts = await web3.eth.getAccounts();

    await admin.transferProxyAdminOwnership(accounts[1], { txOverrides: { gas: 10000009 } });

    await assertGasLimit(oldBlockNumber, 10000009, 1);
  });
});
