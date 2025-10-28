import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.DeployOverload = await ethers.getContractFactory('DeployOverload');
});

test('no args', async t => {
  const c = await upgrades.deployProxy(t.context.DeployOverload, {
    kind: 'transparent',
    initializer: 'customInitialize',
  });
  t.is((await c.value()).toString(), '42');
});
