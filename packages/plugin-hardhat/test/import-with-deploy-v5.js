const test = require('ava');

const { ethers, upgrades } = require('hardhat');

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const TransparentUpgradableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');

  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );

  t.context.ERC1967Proxy = await ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode);
});

test('import then deploy with same impl', async t => {
  const { GreeterProxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.waitForDeployment();
  const proxy = await ERC1967Proxy.deploy(
    await impl.getAddress(),
    GreeterProxiable.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  await proxy.waitForDeployment();

  const greeter = await upgrades.forceImport(await proxy.getAddress(), GreeterProxiable);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeter2 = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat 2!']);
  await greeter2.waitForDeployment();
  t.is(await greeter2.greet(), 'Hello, Hardhat 2!');

  t.is(
    await upgrades.erc1967.getImplementationAddress(await greeter2.getAddress()),
    await upgrades.erc1967.getImplementationAddress(await greeter.getAddress()),
  );
});

test('deploy then import with same impl', async t => {
  const { GreeterProxiable, GreeterV2Proxiable, ERC1967Proxy } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
  await greeter.waitForDeployment();

  const impl = await GreeterProxiable.deploy();
  await impl.waitForDeployment();
  const proxy = await ERC1967Proxy.deploy(
    await impl.getAddress(),
    GreeterProxiable.interface.encodeFunctionData('initialize', ['Hello, Hardhat 2!']),
  );
  await proxy.waitForDeployment();

  const greeter2 = await upgrades.forceImport(await proxy.getAddress(), GreeterProxiable);
  t.is(await greeter2.greet(), 'Hello, Hardhat 2!');

  const implAddr1 = await upgrades.erc1967.getImplementationAddress(await greeter.getAddress());
  const implAddr2 = await upgrades.erc1967.getImplementationAddress(await greeter2.getAddress());
  t.not(implAddr2, implAddr1);

  // upgrade imported proxy to the same impl
  await upgrades.upgradeProxy(greeter2, GreeterProxiable);
  const implAddrUpgraded = await upgrades.erc1967.getImplementationAddress(await greeter2.getAddress());
  t.true(implAddrUpgraded === implAddr1 || implAddrUpgraded === implAddr2, implAddrUpgraded);

  // upgrade imported proxy to different impl
  await upgrades.upgradeProxy(greeter2, GreeterV2Proxiable);
  const implAddrUpgraded2 = await upgrades.erc1967.getImplementationAddress(await greeter2.getAddress());
  t.not(implAddrUpgraded2 !== implAddrUpgraded, implAddrUpgraded2);
});

test('import previous deployment', async t => {
  const { GreeterProxiable } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
  await greeter.waitForDeployment();

  const greeterImported = await upgrades.forceImport(await greeter.getAddress(), GreeterProxiable);
  t.is(await greeterImported.greet(), 'Hello, Hardhat!');

  t.is(await greeterImported.getAddress(), await greeter.getAddress());
  t.is(
    await upgrades.erc1967.getImplementationAddress(await greeterImported.getAddress()),
    await upgrades.erc1967.getImplementationAddress(await greeter.getAddress()),
  );
});

test('import previous import', async t => {
  const { GreeterProxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.waitForDeployment();
  const proxy = await ERC1967Proxy.deploy(
    await impl.getAddress(),
    GreeterProxiable.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  await proxy.waitForDeployment();

  const greeterImported = await upgrades.forceImport(await proxy.getAddress(), GreeterProxiable);
  const greeterImportedAgain = await upgrades.forceImport(await proxy.getAddress(), GreeterProxiable);

  t.is(await greeterImportedAgain.getAddress(), await greeterImported.getAddress());
  t.is(
    await upgrades.erc1967.getImplementationAddress(await greeterImportedAgain.getAddress()),
    await upgrades.erc1967.getImplementationAddress(await greeterImported.getAddress()),
  );
});

test('import then deploy transparent (with deployProxy) with different admin', async t => {
  const { Greeter, GreeterV2, TransparentUpgradableProxy } = t.context;

  const owner = await ethers.provider.getSigner(0);

  const impl = await Greeter.deploy();
  await impl.waitForDeployment();
  const proxy = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    owner,
    Greeter.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  await proxy.waitForDeployment();

  const greeter = await upgrades.forceImport(await proxy.getAddress(), Greeter);
  const greeter2 = await upgrades.deployProxy(Greeter, ['Hello, Hardhat 2!']);
  await greeter2.waitForDeployment();

  t.not(
    await upgrades.erc1967.getAdminAddress(await greeter2.getAddress()),
    await upgrades.erc1967.getAdminAddress(await greeter.getAddress()),
  );

  const upgraded = await upgrades.upgradeProxy(await greeter.getAddress(), GreeterV2);
  await upgraded.waitForDeployment();
  const upgraded2 = await upgrades.upgradeProxy(await greeter2.getAddress(), GreeterV2);
  await upgraded2.waitForDeployment();
});
