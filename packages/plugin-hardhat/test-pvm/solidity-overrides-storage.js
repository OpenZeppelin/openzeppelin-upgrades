const { expect } = require('chai');

const { ethers, upgrades } = require('hardhat');

describe('Solidity Overrides Storage', async () => {
  let context;
  beforeEach(async () => {
    const GapV1 = await ethers.getContractFactory('GapV1');
    const GapV2 = await ethers.getContractFactory('GapV2');
    const GapV2_Bad = await ethers.getContractFactory('GapV2_Bad');
    context = {
      GapV1,
      GapV2,
      GapV2_Bad,
    };
  });

  it('use gap correctly with solidity config overrides', async () => {
    const { GapV1, GapV2 } = context;
    const proxy = await upgrades.deployProxy(GapV1);
    await upgrades.upgradeProxy(proxy, GapV2);
  });

  it('use gap incorrectly', async () => {
    const { GapV1, GapV2_Bad } = context;
    const proxy = await upgrades.deployProxy(GapV1);
    await expect(upgrades.upgradeProxy(proxy, GapV2_Bad)).to.be.rejectedWith(/Set __gap array to size 47/);
  });
});
