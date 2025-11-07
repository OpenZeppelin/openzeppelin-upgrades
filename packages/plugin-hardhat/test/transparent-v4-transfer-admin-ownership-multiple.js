import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json' with { type: 'json' };
import TransparentUpgradableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json' with { type: 'json' };

let upgrades;

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );
});

test('transferProxyAdminOwnership v4 multiple proxies', async t => {
  const { Greeter, ProxyAdmin, TransparentUpgradableProxy } = t.context;

  // Deploy a v4 proxy and admin, and import them
  const impl = await Greeter.deploy();
  await impl.waitForDeployment();
  const admin = await ProxyAdmin.deploy();
  await admin.waitForDeployment();
  const proxy = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    await admin.getAddress(),
    Greeter.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  const greeter = await upgrades.forceImport(await proxy.getAddress(), Greeter);

  // Deploy a second proxy with same admin, and import it
  const proxy2 = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    await admin.getAddress(),
    Greeter.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  await upgrades.forceImport(await proxy2.getAddress(), Greeter);

  // Deploy an unrelated UUPS proxy
  const GreeterProxiable = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
  const signer = await ethers.provider.getSigner();
  await upgrades.deployProxy(GreeterProxiable, [await signer.getAddress(), 'Hello, Hardhat!'], { kind: 'uups' });

  await upgrades.admin.transferProxyAdminOwnership(await greeter.getAddress(), testAddress);
  t.is(await admin.owner(), testAddress);
});
