const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
});

test('uups with initialOwner option', async t => {
  const { Greeter } = t.context;

  const initialOwner = await ethers.provider.getSigner(1);

  await t.throwsAsync(upgrades.deployProxy(Greeter, ['hello'], { initialOwner: initialOwner.address }), {
    message: /The `initialOwner` option is not supported for this kind of proxy \('uups'\)/,
  });
});
