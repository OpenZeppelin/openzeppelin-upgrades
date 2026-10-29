import test from 'ava';
import hre from 'hardhat';
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

const connection = await hre.network.create();
const { ethers } = connection;

/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.WithConstructor = await ethers.getContractFactory('contracts/WithConstructor.sol:WithConstructor');
});

test('new proxy - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [17], initializer: false });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(await proxy1.getAddress());
  t.is(await proxy1.value(), 17n);

  const proxy2 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [17], initializer: false });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(await proxy2.getAddress());
  t.is(await proxy2.value(), 17n);

  t.is(implementation1, implementation2);
});

test('new proxy - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [17], initializer: false });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(await proxy1.getAddress());
  t.is(await proxy1.value(), 17n);

  const proxy2 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [42], initializer: false });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(await proxy2.getAddress());
  t.is(await proxy2.value(), 42n);

  t.not(implementation1, implementation2);
});

test('upgrade - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [17], initializer: false });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(await proxy1.getAddress());
  t.is(await proxy1.value(), 17n);

  const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, { constructorArgs: [17], initializer: false });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(await proxy2.getAddress());
  t.is(await proxy2.value(), 17n);

  t.is(implementation1, implementation2);
});

test('upgrade - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, [], { constructorArgs: [17], initializer: false });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(await proxy1.getAddress());
  t.is(await proxy1.value(), 17n);

  const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, { constructorArgs: [42], initializer: false });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(await proxy2.getAddress());
  t.is(await proxy2.value(), 42n);

  t.not(implementation1, implementation2);
});

test('validateImplementation without constructorArgs', async t => {
  const { WithConstructor } = t.context;
  // Regression for #654: validation must not require constructorArgs.
  await t.notThrowsAsync(() =>
    upgrades.validateImplementation(WithConstructor, { unsafeAllow: ['constructor'] }),
  );
});

test('deployProxy still requires constructorArgs when the constructor needs them', async t => {
  const { WithConstructor } = t.context;
  await t.throwsAsync(() => upgrades.deployProxy(WithConstructor, [], { initializer: false }), {
    message: /types\/values length mismatch|Expected .* constructor argument/,
  });
});

