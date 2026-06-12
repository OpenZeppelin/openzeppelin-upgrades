import test from 'ava';
import hre from 'hardhat';

import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

test('throws a helpful error if the connection is missing', async t => {
  await t.throwsAsync(() => upgradesFactory(hre, undefined), { message: /network connection is required/ });
});

test('throws a helpful error if hardhat-viem is not in use', async t => {
  // Simulates a connection from a Hardhat config that does not register @nomicfoundation/hardhat-viem
  const connectionWithoutViem = {};

  await t.throwsAsync(() => upgradesFactory(hre, connectionWithoutViem), {
    message: /requires the @nomicfoundation\/hardhat-viem plugin/,
  });
});

test('throws a helpful error if the hardhat-upgrades plugin is not in use', async t => {
  // Simulates a connection from a Hardhat config that registers @nomicfoundation/hardhat-viem
  // but not this plugin, which is what loads @nomicfoundation/hardhat-ethers
  const connectionWithoutEthers = { viem: {} };

  await t.throwsAsync(() => upgradesFactory(hre, connectionWithoutEthers), {
    message: /requires the @openzeppelin\/hardhat-upgrades plugin/,
  });
});
