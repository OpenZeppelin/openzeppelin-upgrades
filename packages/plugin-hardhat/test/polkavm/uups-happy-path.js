// const test = require('ava');
const { expect } = require("chai");

describe('happy path', async () => {
  let context;
  beforeEach(async () => {
    let Greeter = await ethers.getContractFactory('GreeterProxiable');
    let GreeterV2 = await ethers.getContractFactory('GreeterV2Proxiable');
    let GreeterV3 = await ethers.getContractFactory('GreeterV3Proxiable');
    context = {
      Greeter,
      GreeterV2,
      GreeterV3
    }
  });

  it('happy path', async () => {
    const { Greeter, GreeterV2, GreeterV3 } = context;

    const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

    const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
    await greeter2.waitForDeployment();
    await greeter2.resetGreeting();

    const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
    const greeter3 = GreeterV3.attach(greeter3ImplAddr);
    const version3 = await greeter3.version();
    expect(version3).to.equal('V3');
  });
})
