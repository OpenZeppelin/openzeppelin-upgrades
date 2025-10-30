const { expect } = require('chai');

const { ethers, upgrades } = require('hardhat');

describe("UUPS Upgrade Storage", async () => {
  let context;
  beforeEach(async () => {
    Greeter = await ethers.getContractFactory('GreeterProxiable');
    GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflictProxiable');
    context = { Greeter, GreeterStorageConflict };
  });

  it('incompatible storage', async () => {
    const { Greeter, GreeterStorageConflict } = context;
    const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    await expect(upgrades.upgradeProxy(greeter, GreeterStorageConflict)).to.be.rejectedWith(/New storage layout is incompatible.*/);
  });

  it('incompatible storage - forced', async () => {
    const { Greeter, GreeterStorageConflict } = context;
    const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    await upgrades.upgradeProxy(greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  })
})
