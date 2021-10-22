const assert = require('assert');
const upgrades = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterProxiable = artifacts.require('GreeterProxiable');

it('infer proxy kind', async function () {
  const uups = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
  assert.strictEqual(
    await upgrades.erc1967.getAdminAddress(uups.address),
    '0x0000000000000000000000000000000000000000',
  );

  const transparent = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  assert.strictEqual(
    await upgrades.erc1967.getAdminAddress(transparent.address),
    (await upgrades.admin.getInstance()).address,
  );
});
