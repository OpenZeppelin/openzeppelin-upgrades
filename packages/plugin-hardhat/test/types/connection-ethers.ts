import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

/**
 * Regression test for the re-export of @nomicfoundation/hardhat-ethers types from this plugin.
 *
 * This file is type-checked (not executed) against the built `dist` types via the tsconfig in
 * this directory, in isolation from the rest of the repo. It asserts that importing only
 * `@openzeppelin/hardhat-upgrades` is enough for TypeScript to recognize `connection.ethers`,
 * matching the runtime behavior where the plugin loads hardhat-ethers as a plugin dependency.
 */
export async function typeCheck(): Promise<void> {
  const connection = await hre.network.create();
  const { ethers } = connection;
  const upgradesApi = await upgrades(hre, connection);

  const factory = await ethers.getContractFactory('MyContract');
  const proxy = await upgradesApi.deployProxy(factory, [42]);
  await proxy.getAddress();
}
