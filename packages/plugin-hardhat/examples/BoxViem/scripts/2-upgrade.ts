import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades/viem';

const PROXY_ADDRESS = '0x...'; // Replace with your proxy address from 1-deploy.ts

async function main() {
  if (PROXY_ADDRESS === '0x...') {
    console.error('Please set PROXY_ADDRESS to your deployed proxy address');
    process.exit(1);
  }

  const connection = await hre.network.create();
  const upgradesApi = await upgrades(hre, connection);

  const box = await upgradesApi.upgradeProxy(PROXY_ADDRESS, 'BoxV2');

  console.log('Box upgraded at:', box.address);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
