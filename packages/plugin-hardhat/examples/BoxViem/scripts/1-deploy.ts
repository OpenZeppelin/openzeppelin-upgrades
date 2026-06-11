import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades/viem';

async function main() {
  const connection = await hre.network.create();
  const upgradesApi = await upgrades(hre, connection);

  const box = await upgradesApi.deployProxy('Box', [42n], { kind: 'transparent' });

  console.log('Proxy deployed to:', box.address);
  console.log('Initial value:', await box.read.retrieve());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
