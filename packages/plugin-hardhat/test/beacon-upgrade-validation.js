import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
});

test('invalid upgrade', async t => {
  const { Greeter, Invalid } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hola mundo!']);
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, Invalid),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
