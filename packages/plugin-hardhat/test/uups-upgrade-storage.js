import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('contracts/Greeter.sol:GreeterProxiable');
  t.context.GreeterStorageConflict = await ethers.getContractFactory(
    'contracts/InvalidGreeter.sol:GreeterStorageConflictProxiable',
  );
});

test('incompatible storage', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;
  const signer = await ethers.provider.getSigner();
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, GreeterStorageConflict),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});

test('incompatible storage - forced', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;
  const signer = await ethers.provider.getSigner();
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await upgrades.upgradeProxy(greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
});
