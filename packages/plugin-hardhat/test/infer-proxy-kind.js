import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
});

test('infer proxy kind', async t => {
  const { Greeter, GreeterProxiable } = t.context;

  const signer = await ethers.provider.getSigner();
  const uups = await upgrades.deployProxy(GreeterProxiable, [await signer.getAddress(), 'Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(await uups.getAddress()), ethers.ZeroAddress);

  const transparent = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  t.not(await upgrades.erc1967.getAdminAddress(await transparent.getAddress()), ethers.ZeroAddress);

  const beacon = await upgrades.deployBeacon(Greeter);
  const beaconProxy = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(await beaconProxy.getAddress()), ethers.ZeroAddress);
  t.not(await upgrades.erc1967.getBeaconAddress(await beaconProxy.getAddress()), ethers.ZeroAddress);
});
