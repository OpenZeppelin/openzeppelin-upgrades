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

test('deploy and upgrade proxy with linked library', async t => {
  const safeMathLib = await connection.viem.deployContract('SafeMath');
  const safeMathLibV2 = await connection.viem.deployContract('SafeMathV2');

  const token = await upgrades.deployProxy('TokenProxiable', ['TKN', 10000], {
    kind: 'uups',
    unsafeAllow: ['external-library-linking'],
    libraries: { SafeMath: safeMathLib.address },
  });
  t.is(await token.read.getLibraryVersion(), 'V1');

  const token2 = await upgrades.upgradeProxy(token, 'TokenProxiable', {
    unsafeAllow: ['external-library-linking'],
    libraries: { SafeMath: safeMathLibV2.address },
    redeployImplementation: 'always',
  });
  t.is(await token2.read.getLibraryVersion(), 'V2');
});

test('without unsafeAllow flag', async t => {
  const safeMathLib = await connection.viem.deployContract('SafeMath');

  await t.throwsAsync(
    () =>
      upgrades.deployProxy('TokenProxiable', ['TKN', 10000], {
        kind: 'uups',
        libraries: { SafeMath: safeMathLib.address },
      }),
    { message: /TokenProxiable` is not upgrade safe/ },
  );
});
