import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

const PROXY_ADDRESS = '0x...'; // Replace with your proxy address from 1-deploy.ts

async function main() {
  if (PROXY_ADDRESS === '0x...') {
    console.error('Please set PROXY_ADDRESS to your deployed proxy address');
    process.exit(1);
  }

  const connection = await hre.network.connect();
  const { ethers } = connection;
  const upgradesApi = await upgrades(hre, connection);

  const BoxV2 = await ethers.getContractFactory('BoxV2');
  const box = await upgradesApi.upgradeProxy(PROXY_ADDRESS, BoxV2, { kind: 'uups' });
  await box.waitForDeployment();

  console.log('Box upgraded at:', await box.getAddress());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
