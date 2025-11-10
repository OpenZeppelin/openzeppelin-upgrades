const { expect } = require('chai');

const { ethers, upgrades } = require('hardhat');

describe('UUPS Upgrade Validation', async () => {
  let context;
  beforeEach(async () => {
    let Greeter = await ethers.getContractFactory('GreeterProxiable');
    let Invalid = await ethers.getContractFactory('InvalidPVMProxiable');
    context = { Greeter, Invalid };
  });

  it('deploy unsafe implementation', async () => {
    const { Invalid } = context;
    await expect(upgrades.deployProxy(Invalid, ['Hola mundo!'], { kind: 'uups' })).to.be.rejectedWith(
      /is not upgrade safe/,
    );
  });

  it('upgrade to unsafe implementation', async () => {
    const { Greeter, Invalid } = context;
    const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    await expect(upgrades.upgradeProxy(greeter, Invalid)).to.be.rejectedWith(/is not upgrade safe/);
  });
});
