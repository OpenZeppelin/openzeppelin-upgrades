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
  t.context.Invalid = await ethers.getContractFactory('InvalidProxiable');
});

test('invalid deployment', async t => {
  const { Invalid } = t.context;
  await t.throwsAsync(
    () => upgrades.deployProxy(Invalid, { kind: 'uups' }),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
