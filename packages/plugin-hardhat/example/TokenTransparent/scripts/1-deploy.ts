import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

/**
 * Deployment script for TokenV1.
 *
 * This script demonstrates how to deploy an upgradeable contract using
 * Hardhat 3's connection-based API with the Transparent proxy pattern.
 */
async function main() {
  // Get network connection (required in Hardhat 3)
  const connection = await hre.network.connect();
  const { ethers } = connection;

  // Get the upgrades API factory function
  const upgradesApi = await upgrades(hre, connection);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Get the contract factory
  const TokenV1 = await ethers.getContractFactory('TokenV1');

  // Deploy the proxy with the initial owner set to the deployer
  console.log('\nDeploying TokenV1 proxy...');
  const proxy = await upgradesApi.deployProxy(TokenV1, [deployer.address], {
    kind: 'transparent',
  });

  // Wait for deployment to complete
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  console.log('\n✅ Deployment successful!');
  console.log('Proxy address:', proxyAddress);
  console.log('\n💡 Save this address for the upgrade script!');
  console.log('   You can set it as PROXY_ADDRESS in scripts/2-upgrade.ts');

  // Get implementation address for reference
  const implementationAddress = await upgradesApi.erc1967.getImplementationAddress(proxyAddress);
  console.log('Implementation address:', implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
