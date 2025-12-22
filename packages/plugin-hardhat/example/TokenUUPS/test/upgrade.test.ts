import test from 'ava';
import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

/**
 * Integration tests for the UUPS upgrade workflow.
 *
 * These tests demonstrate:
 * 1. Deploying V1 with Ownable and UUPS
 * 2. Upgrading to V2 with AccessControl and UUPS
 * 3. State preservation during upgrade
 * 4. Access control functionality after upgrade
 */

interface TestContext {
  upgradesApi: Awaited<ReturnType<typeof upgrades>>;
  ethers: any;
  connection: any;
}

test.before(async t => {
  // In Hardhat 3, we need to get the connection and upgrades API once
  const connection = await hre.network.connect();
  const { ethers } = connection as any;
  const upgradesApi = await upgrades(hre, connection);
  
  (t.context as TestContext).connection = connection;
  (t.context as TestContext).ethers = ethers;
  (t.context as TestContext).upgradesApi = upgradesApi;
});

test('Should deploy V1, upgrade to V2, and preserve state', async t => {
  const { upgradesApi, ethers } = t.context as TestContext;
  const [owner, _, user] = await ethers.getSigners();

  // Deploy V1 with Ownable and UUPS
  const TokenV1 = await ethers.getContractFactory('TokenV1');
  const proxy = await upgradesApi.deployProxy(TokenV1, [owner.address], {
    kind: 'uups',
  });
  const proxyAddress = await proxy.getAddress();

  // Verify V1 functionality
  const tokenV1 = await ethers.getContractAt('TokenV1', proxyAddress);
  t.is(await tokenV1.owner(), owner.address);

  // Mint some tokens in V1 to verify state preservation
  const mintAmount = ethers.parseEther('1000');
  await tokenV1.mint(user.address, mintAmount);
  t.is(await tokenV1.balanceOf(user.address), mintAmount);

  // Upgrade to V2 with migration
  const TokenV2 = await ethers.getContractFactory('TokenV2');
  await upgradesApi.upgradeProxy(proxyAddress, TokenV2, {
    kind: 'uups',
    call: {
      fn: 'migrateFromV1',
      args: [owner.address],
    },
  });

  // Verify state is preserved
  const tokenV2 = await ethers.getContractAt('TokenV2', proxyAddress);
  t.is(await tokenV2.balanceOf(user.address), mintAmount);

  // Verify roles were migrated correctly
  const MINTER_ROLE = await tokenV2.MINTER_ROLE();
  const UPGRADER_ROLE = await tokenV2.UPGRADER_ROLE();
  const DEFAULT_ADMIN_ROLE = await tokenV2.DEFAULT_ADMIN_ROLE();

  t.true(await tokenV2.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
  t.true(await tokenV2.hasRole(MINTER_ROLE, owner.address));
  t.true(await tokenV2.hasRole(UPGRADER_ROLE, owner.address));

  // Verify minting works with role-based access
  const additionalMint = ethers.parseEther('500');
  await tokenV2.mint(user.address, additionalMint);
  t.is(await tokenV2.balanceOf(user.address), mintAmount + additionalMint);
});

test('Should prevent non-minters from minting in V2', async t => {
  const { upgradesApi, ethers } = t.context as TestContext;
  const [owner, nonMinter] = await ethers.getSigners();

  // Deploy and upgrade
  const TokenV1 = await ethers.getContractFactory('TokenV1');
  const proxy = await upgradesApi.deployProxy(TokenV1, [owner.address], {
    kind: 'uups',
  });
  const proxyAddress = await proxy.getAddress();

  const TokenV2 = await ethers.getContractFactory('TokenV2');
  await upgradesApi.upgradeProxy(proxyAddress, TokenV2, {
    kind: 'uups',
    call: {
      fn: 'migrateFromV1',
      args: [owner.address],
    },
  });

  const tokenV2 = await ethers.getContractAt('TokenV2', proxyAddress);

  // Non-minter should not be able to mint
  const error = await t.throwsAsync(
    () => tokenV2.connect(nonMinter).mint(nonMinter.address, ethers.parseEther('100')),
  );
  t.true(error?.message?.includes('AccessControlUnauthorizedAccount') || (error as any)?.reason?.includes('AccessControlUnauthorizedAccount'));
});
