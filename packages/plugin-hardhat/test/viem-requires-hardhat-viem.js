import test from 'ava';
import hre from 'hardhat';

import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

test('throws a helpful error if hardhat-viem is not in use', async t => {
  // Simulates a connection from a Hardhat config that does not register @nomicfoundation/hardhat-viem
  const connectionWithoutViem = {};

  const error = await t.throwsAsync(() => upgradesFactory(hre, connectionWithoutViem));
  t.true(error.message.includes('requires the @nomicfoundation/hardhat-viem plugin'));
});
