const { expect } = require('chai');

const { ethers, upgrades } = require('hardhat');

describe('UUPS Upgrade Storage', async () => {
  let context;
  beforeEach(async () => {
    let greeter = await ethers.getContractFactory('GreeterProxiable');
    let greeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflictProxiable');
    context = { greeter, greeterStorageConflict };
  });

  it('incompatible storage', async () => {
    const { greeter, greeterStorageConflict } = context;
    const greeterProxy = await upgrades.deployProxy(greeter, ['Hola mundo!'], { kind: 'uups' });
    await expect(upgrades.upgradeProxy(greeterProxy, greeterStorageConflict)).to.be.rejectedWith(
      /New storage layout is incompatible.*/,
    );
  });

  it('incompatible storage - forced', async () => {
    const { greeter, greeterStorageConflict } = context;
    const greeterProxy = await upgrades.deployProxy(greeter, ['Hola mundo!'], { kind: 'uups' });
    await upgrades.upgradeProxy(greeterProxy, greeterStorageConflict, { unsafeSkipStorageCheck: true });
  });
});
