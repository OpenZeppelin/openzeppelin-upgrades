const { expect } = require("chai");

const { ethers, upgrades } = require('hardhat');

describe('happy path', async () => {
  let context;
  beforeEach(async () => {
    const Greeter = await ethers.getContractFactory('Greeter');
    const GreeterV2 = await ethers.getContractFactory('GreeterV2');
    const GreeterV3 = await ethers.getContractFactory('GreeterV3');
    context = {
      Greeter,
      GreeterV2,
      GreeterV3
    }
  })
  it('test', async () => {
    const { Greeter, GreeterV2, GreeterV3 } = context;

    const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

    const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
    await greeter2.waitForDeployment();
    try {
      await greeter2.resetGreeting();
    } catch (e) {
      console.log(e)
    }

    const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
    const greeter3 = GreeterV3.attach(greeter3ImplAddr);
    const version3 = await greeter3.version();
    expect(version3).to.equal('V3');
  })
})

// test.before(async t => {
//   t.context.Greeter = await ethers.getContractFactory('Greeter');
//   t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
//   t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
// });

// test('happy path', async t => {
//   const { Greeter, GreeterV2, GreeterV3 } = t.context;

//   const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

//   const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
//   await greeter2.waitForDeployment();
//   await greeter2.resetGreeting();

//   const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
//   const greeter3 = GreeterV3.attach(greeter3ImplAddr);
//   const version3 = await greeter3.version();
//   t.is(version3, 'V3');
// });
