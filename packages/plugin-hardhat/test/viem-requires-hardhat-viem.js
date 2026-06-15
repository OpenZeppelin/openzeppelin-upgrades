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

test('does not require @nomicfoundation/hardhat-ethers', async t => {
  // The viem-based API drives the client-neutral engine through viem, so it no longer depends on
  // @nomicfoundation/hardhat-ethers being loaded (which is what `connection.ethers` would indicate).
  // A connection that has viem but no ethers must build the API without throwing.
  const connectionWithoutEthers = { viem: {} };

  await t.notThrowsAsync(() => upgradesFactory(hre, connectionWithoutEthers));
});
