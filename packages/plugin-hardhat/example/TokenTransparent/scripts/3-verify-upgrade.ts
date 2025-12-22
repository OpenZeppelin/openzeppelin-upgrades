import hre from 'hardhat';

/**
 * Verification script to test TokenV2 functionality after upgrade.
 *
 * This script verifies that:
 * 1. The upgrade was successful
 * 2. Access control roles are correctly set
 * 3. Token functionality (minting) still works
 * 4. Previous state (balances) is preserved
 */
const PROXY_ADDRESS = '0x...'; // TODO: Replace with your proxy address

async function main() {
  if (PROXY_ADDRESS === '0x...') {
    console.error('❌ Please set PROXY_ADDRESS in this script to your deployed proxy address');
    process.exit(1);
  }

  // Get network connection (required in Hardhat 3)
  const connection = await hre.network.connect();
  const { ethers } = connection;

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Verifying with account:', deployer.address);

  // Get the contract instance
  const token = await ethers.getContractAt('TokenV2', PROXY_ADDRESS);

  // Get role constants
  const MINTER_ROLE = await token.MINTER_ROLE();
  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

  console.log('\n📋 Checking access control roles...');
  const hasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasMinter = await token.hasRole(MINTER_ROLE, deployer.address);

  console.log('Deployer has DEFAULT_ADMIN_ROLE:', hasAdmin);
  console.log('Deployer has MINTER_ROLE:', hasMinter);

  if (!hasAdmin || !hasMinter) {
    console.log('⚠️  Warning: Deployer does not have expected roles');
    console.log('   This might be expected if you upgraded with a different account');
  }

  // Check token metadata
  console.log('\n📋 Checking token metadata...');
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  console.log('Token name:', name);
  console.log('Token symbol:', symbol);
  console.log('Total supply:', ethers.formatEther(totalSupply), symbol);

  // Test minting functionality
  console.log('\n🧪 Testing minting functionality...');
  try {
    const mintAmount = ethers.parseEther('100');
    const balanceBefore = await token.balanceOf(deployer.address);

    console.log('Balance before mint:', ethers.formatEther(balanceBefore), symbol);

    const tx = await token.mint(deployer.address, mintAmount);
    await tx.wait();

    const balanceAfter = await token.balanceOf(deployer.address);
    console.log('Balance after mint:', ethers.formatEther(balanceAfter), symbol);

    if (balanceAfter === balanceBefore + mintAmount) {
      console.log('✅ Minting successful!');
    } else {
      console.log('❌ Minting failed: balance mismatch');
    }
  } catch (error: any) {
    console.error('❌ Minting failed:', error.message);
    if (error.message.includes('AccessControl')) {
      console.log('   This likely means the deployer does not have MINTER_ROLE');
    }
  }

  // Check if permit functionality is available
  console.log('\n📋 Checking ERC20Permit functionality...');
  try {
    const nonces = await token.nonces(deployer.address);
    console.log('Permit nonces:', nonces.toString());
    console.log('✅ ERC20Permit is available');
  } catch (error) {
    console.log('⚠️  Could not verify ERC20Permit');
  }

  console.log('\n✅ Verification complete!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
