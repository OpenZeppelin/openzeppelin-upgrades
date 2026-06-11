import test from 'ava';
import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades/viem';

const connection = await hre.network.create();
const upgradesApi = await upgrades(hre, connection);

test.after.always(() => connection.close());

test('deploys Box and preserves state through upgrade', async t => {
  const box = await upgradesApi.deployProxy('Box', [42n], { kind: 'transparent' });
  t.is(await box.read.retrieve(), 42n);

  await box.write.store([100n]);
  t.is(await box.read.retrieve(), 100n);

  const boxV2 = await upgradesApi.upgradeProxy(box.address, 'BoxV2');

  // State is preserved after upgrade
  t.is(await boxV2.read.retrieve(), 100n);

  // New function works
  await boxV2.write.increment();
  t.is(await boxV2.read.retrieve(), 101n);
});
