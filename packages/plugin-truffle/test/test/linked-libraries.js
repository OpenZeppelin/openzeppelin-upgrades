const assert = require('assert');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const SafeMathV2 = artifacts.require('SafeMathV2');
const Token = artifacts.require('Token');
const TokenV2 = artifacts.require('TokenV2');
const TokenV3 = artifacts.require('TokenV3');

contract('Token without flag', function () {
  it('deployProxy', async function () {
    await assert.rejects(deployProxy(Token, ['TKN', 10000]));

    // we need use the flag to deploy in order to have an address to upgrade
    const token = await deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });
    await assert.rejects(upgradeProxy(token.address, Token));
  });
});

contract('Token with flag', function (accounts) {
  const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';
  const ownerAddress = accounts[0];

  it('Deploy and Upgrade Proxy', async function () {
    const token = await deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });
    const token2 = await upgradeProxy(token.address, TokenV2, { unsafeAllowLinkedLibraries: true });
    assert.strictEqual('10000', (await token2.totalSupply()).toString());
    assert.strictEqual('V1', await token2.getLibraryVersion());
  });

  it('Redeploy Proxy again with different Library', async function () {
    await deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });

    const safeMathLib2 = await SafeMathV2.deployed();
    Token.link('SafeMath', safeMathLib2.address);
    const tokenNew = await deployProxy(Token, ['TKN', 5000], { unsafeAllowLinkedLibraries: true });

    assert.strictEqual('5000', (await tokenNew.totalSupply()).toString());
    assert.strictEqual('V2', await tokenNew.getLibraryVersion());
  });

  it('Upgrade Proxy with different Library', async function () {
    const token = await deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });

    const safeMathLib2 = await SafeMathV2.deployed();
    TokenV2.link('SafeMath', safeMathLib2.address);
    const token2 = await upgradeProxy(token.address, TokenV2, { unsafeAllowLinkedLibraries: true });

    assert.strictEqual(token.address, token2.address);
    assert.strictEqual('10000', (await token2.totalSupply()).toString());
    assert.strictEqual('V2', await token2.getLibraryVersion());

    // Calling transferAll
    assert.strictEqual('10000', (await token2.balanceOf(ownerAddress)).toString());
    await token2.transferAll(testAddress);
    assert.strictEqual('10000', (await token2.balanceOf(testAddress)).toString());
    assert.strictEqual('0', (await token2.balanceOf(ownerAddress)).toString());
  });

  it('Upgrade Proxy with multiple Libraries', async function () {
    const token = await deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });
    const token2 = await upgradeProxy(token.address, TokenV2, { unsafeAllowLinkedLibraries: true });
    const token3 = await upgradeProxy(token2.address, TokenV3, { unsafeAllowLinkedLibraries: true });

    assert.strictEqual(token.address, token3.address);
    assert.strictEqual('10000', (await token3.totalSupply()).toString());
    assert.strictEqual('V1', await token3.getLibraryVersion());

    // Calling transferPercent
    assert.strictEqual('10000', (await token3.balanceOf(ownerAddress)).toString());
    await token3.transferPercent(testAddress, 10);
    assert.strictEqual('1000', (await token3.balanceOf(testAddress)).toString());
    assert.strictEqual('9000', (await token3.balanceOf(ownerAddress)).toString());
  });
});
