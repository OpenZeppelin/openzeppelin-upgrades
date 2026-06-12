import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('validateImplementation - invalid', async t => {
  await t.throwsAsync(() => upgrades.validateImplementation('Invalid'), {
    message: /Invalid` is not upgrade safe/,
  });
});

test('validateImplementation - valid', async t => {
  await t.notThrowsAsync(() => upgrades.validateImplementation('Greeter'));
});

test('validateUpgrade with contract names', async t => {
  await t.notThrowsAsync(() => upgrades.validateUpgrade('Greeter', 'contracts/GreeterV2.sol:GreeterV2', { kind: 'transparent' }));

  await t.throwsAsync(
    () => upgrades.validateUpgrade('contracts/Greeter.sol:GreeterProxiable', 'InvalidProxiable', { kind: 'uups' }),
    { message: /InvalidProxiable` is not upgrade safe/ },
  );
});

test('validateUpgrade with proxy address', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hola!'], { kind: 'transparent' });
  await t.notThrowsAsync(() => upgrades.validateUpgrade(greeter.address, 'contracts/GreeterV2.sol:GreeterV2'));
});

test('invalid deployProxy', async t => {
  await t.throwsAsync(() => upgrades.deployProxy('Invalid', { kind: 'transparent' }), {
    message: /Invalid` is not upgrade safe/,
  });
});

test('invalid upgradeProxy', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hola mundo!'], { kind: 'transparent' });
  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, 'Invalid'), { message: /is not upgrade safe/ });
});
