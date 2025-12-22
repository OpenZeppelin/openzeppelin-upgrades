import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

/**
 * Upgrade script from TokenV1 to TokenV2 with UUPS proxy pattern.
 *
 * This script demonstrates:
 * 1. How to upgrade a UUPS proxy to a new implementation
 * 2. How to handle initialization parameter mismatches using the `call` option
 * 3. How to migrate state from Ownable to AccessControl
 *
 * IMPORTANT: Set PROXY_ADDRESS to the address from the deployment script.
 * IMPORTANT: The account used must be the owner (from V1) to authorize the upgrade.
 */
const PROXY_ADDRESS = '0x...'; // TODO: Replace with your proxy address from 1-deploy.ts

async function main() {
  if (PROXY_ADDRESS === '0x...') {
    console.error('❌ Please set PROXY_ADDRESS in this script to your deployed proxy address');
    process.exit(1);
  }

  // Get network connection (required in Hardhat 3)
  const connection = await hre.network.connect();
  const { ethers } = connection;

  // Get the upgrades API factory function
  const upgradesApi = await upgrades(hre, connection);

  // Get the deployer account (must be the owner from V1)
  const [deployer] = await ethers.getSigners();
  console.log('Upgrading with account:', deployer.address);

  // Get the previous owner before upgrade
  // We need this to migrate the ownership to AccessControl roles
  console.log('\n📋 Getting previous owner from V1...');
  const tokenV1 = await ethers.getContractAt('TokenV1', PROXY_ADDRESS);
  const previousOwner = await tokenV1.owner();
  console.log('Previous owner:', previousOwner);

  // Verify the account is the owner (needed to authorize upgrade in UUPS)
  if (previousOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error('❌ Deployer account is not the owner');
    console.error('   Please use the owner account to authorize the upgrade');
    process.exit(1);
  }
  console.log('✅ Deployer is the owner and can authorize upgrade');

  // Validate the upgrade before executing
  console.log('\n🔍 Validating upgrade compatibility...');
  const TokenV2 = await ethers.getContractFactory('TokenV2');
  try {
    await upgradesApi.validateUpgrade(PROXY_ADDRESS, TokenV2);
    console.log('✅ Upgrade validation passed');
  } catch (error) {
    console.error('❌ Upgrade validation failed:', error);
    process.exit(1);
  }

  // Upgrade the proxy to V2
  // The `call` option allows us to execute a function after the upgrade
  // This is necessary because V2's initialize() has a different signature than V1's
  // With UUPS, the upgrade is authorized by _authorizeUpgrade (called by owner)
  console.log('\n⬆️  Upgrading UUPS proxy to TokenV2...');
  const upgraded = await upgradesApi.upgradeProxy(PROXY_ADDRESS, TokenV2, {
    kind: 'uups',
    call: {
      fn: 'migrateFromV1',
      args: [previousOwner],
    },
  });

  await upgraded.waitForDeployment();
  const proxyAddress = await upgraded.getAddress();

  console.log('\n✅ Upgrade successful!');
  console.log('Proxy address (unchanged):', proxyAddress);
  console.log('New implementation deployed and active');

  // Verify the migration worked
  console.log('\n🔍 Verifying migration...');
  const tokenV2 = await ethers.getContractAt('TokenV2', proxyAddress);
  const MINTER_ROLE = await tokenV2.MINTER_ROLE();
  const UPGRADER_ROLE = await tokenV2.UPGRADER_ROLE();
  const DEFAULT_ADMIN_ROLE = await tokenV2.DEFAULT_ADMIN_ROLE();

  const hasAdmin = await tokenV2.hasRole(DEFAULT_ADMIN_ROLE, previousOwner);
  const hasMinter = await tokenV2.hasRole(MINTER_ROLE, previousOwner);
  const hasUpgrader = await tokenV2.hasRole(UPGRADER_ROLE, previousOwner);

  console.log('Previous owner has DEFAULT_ADMIN_ROLE:', hasAdmin);
  console.log('Previous owner has MINTER_ROLE:', hasMinter);
  console.log('Previous owner has UPGRADER_ROLE:', hasUpgrader);

  if (hasAdmin && hasMinter && hasUpgrader) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log('⚠️  Warning: Migration may not have completed correctly');
  }

  console.log('\n📝 Note: With UUPS, future upgrades must be authorized by UPGRADER_ROLE');
  console.log('   The upgrade authorization is handled by _authorizeUpgrade in the contract');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
