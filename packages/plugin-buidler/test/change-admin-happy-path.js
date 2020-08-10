const { ethers, upgrades, network } = require('@nomiclabs/buidler');
const { getAdminAddress } = require('@openzeppelin/upgrades-core');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Buidler!']);

  console.log('Attempting change Greeter proxy admin...');
  await upgrades.admin.changeProxyAdmin(greeter.address, testAddress);
  const newAdmin = await getAdminAddress(network.provider, greeter.address);

  if (newAdmin !== testAddress) {
    throw new Error('admin.changeProxyAdmin did not change the proxy admin');
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
