const { expect } = require("chai");
// const test = require('ava');

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

  it('happy path', async () => {
    const { Greeter, GreeterV2, GreeterV3 } = context;

    const greeterBeacon = await upgrades.deployBeacon(Greeter);
    const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);
    await greeter.waitForDeployment();
    expect(await greeter.greet()).to.equal('Hello, Hardhat!');

    const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat second!']);
    await greeterSecond.waitForDeployment();
    expect(await greeterSecond.greet()).to.equal('Hello, Hardhat second!');

    // new impl
    await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

    // reload proxy to work with the new contract
    const greeter2 = GreeterV2.attach(await greeter.getAddress());
    expect(await greeter2.greet()).to.equal('Hello, Hardhat!');
    await greeter2.resetGreeting();
    expect(await greeter2.greet()).to.equal('Hello World');

    // reload proxy to work with the new contract
    const greeterSecond2 = GreeterV2.attach(await greeterSecond.getAddress());
    expect(await greeterSecond2.greet()).to.equal('Hello, Hardhat second!');
    await greeterSecond2.resetGreeting();
    expect(await greeterSecond2.greet()).to.equal('Hello World');

    // prepare upgrade from beacon proxy
    const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
    const greeter3 = GreeterV3.attach(greeter3ImplAddr);
    const version3 = await greeter3.version();
    expect(version3).to.equal('V3');

    // prepare upgrade from beacon itself
    const greeter3ImplAddrFromBeacon = await upgrades.prepareUpgrade(await greeterBeacon.getAddress(), GreeterV3);
    const greeter3FromBeacon = GreeterV3.attach(greeter3ImplAddrFromBeacon);
    const version3FromBeacon = await greeter3FromBeacon.version();
    expect(version3FromBeacon).to.equal('V3');
  })
});
