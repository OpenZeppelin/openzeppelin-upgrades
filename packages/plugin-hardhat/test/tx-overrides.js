const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

async function assertGasLimit(t, oldBlockNumber, expectedGasLimit, minExpectedBlocks) {
  const newBlockNumber = await ethers.provider.getBlockNumber();
  t.true(
    newBlockNumber - oldBlockNumber >= minExpectedBlocks,
    `Actual number of blocks ${newBlockNumber - oldBlockNumber}, expected at least ${minExpectedBlocks}`,
  );

  for (let i = oldBlockNumber + 1; i <= newBlockNumber; i++) {
    const block = await ethers.provider.getBlock(i);
    t.is(block.transactions.length, 1); // Assume and assert that tests run with only one tx per block
    const txHash = block.transactions[0];

    const tx = await ethers.provider.getTransaction(txHash);
    t.is(tx.gasLimit, expectedGasLimit);
  }
}

test('deployProxy', async t => {
  const { Greeter } = t.context;
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.deployProxy(Greeter, ['Hello'], {
    redeployImplementation: 'always',
    txOverrides: { gasLimit: 10000001n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000001n, 2);
});

test('upgradeProxy', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello']);
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.upgradeProxy(greeter, GreeterV2, {
    redeployImplementation: 'always',
    txOverrides: { gasLimit: 10000002n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000002n, 2);
});

test('deployBeacon', async t => {
  const { Greeter } = t.context;
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.deployBeacon(Greeter, { redeployImplementation: 'always', txOverrides: { gasLimit: 10000003n } });

  await assertGasLimit(t, oldBlockNumber, 10000003n, 2);
});

test('upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const beacon = await upgrades.deployBeacon(Greeter);
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.upgradeBeacon(beacon, GreeterV2, {
    redeployImplementation: 'always',
    txOverrides: { gasLimit: 10000004n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000004n, 2);
});

test('deployBeaconProxy', async t => {
  const { Greeter } = t.context;
  const beacon = await upgrades.deployBeacon(Greeter);

  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello'], { txOverrides: { gasLimit: 10000005n } });

  await assertGasLimit(t, oldBlockNumber, 10000005n, 1);
});

test('deployImplementation', async t => {
  const { Greeter } = t.context;
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.deployImplementation(Greeter, {
    redeployImplementation: 'always',
    txOverrides: { gasLimit: 10000006n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000006n, 1);
});

test('prepareUpgrade', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello']);
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  await upgrades.prepareUpgrade(greeter, GreeterV2, {
    redeployImplementation: 'always',
    txOverrides: { gasLimit: 10000007n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000007n, 1);
});

test('changeProxyAdmin', async t => {
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello']);
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  const [deployer, newAdmin] = await ethers.getSigners();

  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), newAdmin.address, deployer, {
    txOverrides: { gasLimit: 10000008n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000008n, 1);
});

test('transferProxyAdminOwnership', async t => {
  await upgrades.deployProxyAdmin();
  const oldBlockNumber = await ethers.provider.getBlockNumber();

  const [deployer, newOwner] = await ethers.getSigners();

  await upgrades.admin.transferProxyAdminOwnership(newOwner.address, deployer, {
    txOverrides: { gasLimit: 10000009n },
  });

  await assertGasLimit(t, oldBlockNumber, 10000009n, 1);
});
