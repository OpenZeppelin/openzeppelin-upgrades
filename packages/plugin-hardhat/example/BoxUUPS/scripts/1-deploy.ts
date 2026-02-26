import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const upgradesApi = await upgrades(hre, connection);

  const [deployer] = await ethers.getSigners();
  const Box = await ethers.getContractFactory('Box');
  const box = await upgradesApi.deployProxy(Box, [deployer.address, 42], { kind: 'uups' });
  await box.waitForDeployment();

  const proxyAddress = await box.getAddress();
  const implAddress = await upgradesApi.erc1967.getImplementationAddress(proxyAddress);

  console.log('Proxy deployed to:', proxyAddress);
  console.log('Implementation deployed to:', implAddress);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
