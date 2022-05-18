const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3Proxiable');
});

test('dry run upgradeProxy', async t => {
  const { Greeter, GreeterV3 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  let greeter3 = await upgrades.upgradeProxy(greeter, GreeterV3, { dryRun: true });

  // Since the upgrade was run in dry mode, this should revert
  try {
    await greeter3.resetGreeting();
    t.fail('Expected an error due to dry-running the upgrade');
  } catch (e) {
    t.true(e.message.includes('Transaction reverted: function selector was not recognized'), e.message);
  }
});

test('dry run prepareUpgrade', async t => {
  const { Greeter, GreeterV3 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  let greeter3ImplAddr = await upgrades.prepareUpgrade(greeter.address, GreeterV3, { dryRun: true });
  let greeter3 = GreeterV3.attach(greeter3ImplAddr);

  // Since the upgrade was run in dry mode, this should revert
  try {
    await greeter3.resetGreeting();
    t.fail('Expected an error due to dry-running the upgrade');
  } catch (e) {
    t.true(e.message.includes('Transaction reverted: function selector was not recognized'), e.message);
  }
});

test('dry run catches storage conflict', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, GreeterStorageConflict, { dryRun: true }),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});
