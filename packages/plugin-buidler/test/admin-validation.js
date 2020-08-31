const { ethers, upgrades } = require('@nomiclabs/buidler');
const expectError = require('./expectError');

const NEW_ADMIN = '0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4';

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola admin!']);

  console.log('Attempting upgrade Greeter with an invalid admin...');
  await upgrades.admin.changeProxyAdmin(greeter.address, NEW_ADMIN);
  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  await upgrades.upgradeProxy(greeter.address, GreeterV2);
}

expectError(main, 'Proxy admin is not the one registered in the network manifest');
