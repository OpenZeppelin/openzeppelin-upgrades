import test from 'ava';
import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

const connection = await hre.network.connect();
const { ethers } = connection as any;
const upgradesApi = await upgrades(hre, connection);

test.after.always(() => connection.close());

test('deploys Box and preserves state through upgrade', async t => {
  const [owner] = await ethers.getSigners();
  const Box = await ethers.getContractFactory('Box');
  const BoxV2 = await ethers.getContractFactory('BoxV2');

  const box = await upgradesApi.deployProxy(Box, [owner.address, 42], { kind: 'uups' });
  t.is(await box.retrieve(), 42n);

  await box.store(100);
  t.is(await box.retrieve(), 100n);

  const boxV2 = await upgradesApi.upgradeProxy(await box.getAddress(), BoxV2);

  // State is preserved after upgrade
  t.is(await boxV2.retrieve(), 100n);

  // New function works
  await boxV2.increment();
  t.is(await boxV2.retrieve(), 101n);
});
