const assert = require('assert');
const { ethers, upgrades, config } = require('@nomiclabs/buidler');
const { readArtifact } = require('@nomiclabs/buidler/plugins');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

async function withoutFlag() {
  console.log('Deploying library...');
  const safeMathLib = await deployLibrary('SafeMath');

  console.log('Attempting to Deploy Token...');
  const Token = await getLinkedContractFactory('Token', { SafeMath: safeMathLib.address });
  const token = await upgrades.deployProxy(Token, ['TKN', 10000]);

  console.log('Getting total supply...');
  await token.totalSupply();
}

async function withFlag() {
  const accounts = await ethers.getSigners();
  const ownerAddress = await accounts[0].getAddress();

  console.log('Deploying libraries...');
  const safeMathLib = await deployLibrary('SafeMath');
  const safeMathLib2 = await deployLibrary('SafeMathV2');
  const safePctLib = await deployLibrary('SafePercent');

  console.log('Deploying Token...');
  const Token = await getLinkedContractFactory('Token', { SafeMath: safeMathLib.address });
  const token = await upgrades.deployProxy(Token, ['TKN', 10000], { unsafeAllowLinkedLibraries: true });

  assert.strictEqual('10000', (await token.totalSupply()).toString());
  assert.strictEqual('V1', await token.getLibraryVersion());

  console.log('Deploying Token with different Library...');
  const TokenNew = await getLinkedContractFactory('Token', { SafeMath: safeMathLib2.address });
  const tokenNew = await upgrades.deployProxy(TokenNew, ['TKN', 5000], { unsafeAllowLinkedLibraries: true });

  assert.strictEqual('5000', (await tokenNew.totalSupply()).toString());
  assert.strictEqual('V2', await tokenNew.getLibraryVersion());

  console.log('Attempting to upgrade to TokenV2 using same library...');
  const TokenV2 = await getLinkedContractFactory('TokenV2', { SafeMath: safeMathLib.address });
  const token2 = await upgrades.upgradeProxy(token.address, TokenV2, { unsafeAllowLinkedLibraries: true });

  assert.strictEqual(token.address, token2.address);
  assert.strictEqual('10000', (await token2.totalSupply()).toString());
  assert.strictEqual('V1', await token2.getLibraryVersion());

  console.log('Attempting to upgrade to same TokenV2 using different library...');
  const TokenV2New = await getLinkedContractFactory('TokenV2', { SafeMath: safeMathLib2.address });
  const token2New = await upgrades.upgradeProxy(token.address, TokenV2New, { unsafeAllowLinkedLibraries: true });

  assert.strictEqual(token.address, token2New.address);
  assert.strictEqual('10000', (await token2New.totalSupply()).toString());
  assert.strictEqual('V2', await token2New.getLibraryVersion());

  console.log('Attempting to upgrade to LibraryTesterV3 using multiple libraries...');
  const TokenV3 = await getLinkedContractFactory('TokenV3', {
    SafeMath: safeMathLib.address,
    SafePercent: safePctLib.address,
  });
  const token3 = await upgrades.upgradeProxy(token.address, TokenV3, { unsafeAllowLinkedLibraries: true });

  assert.strictEqual(token.address, token3.address);
  assert.strictEqual('10000', (await token3.totalSupply()).toString());
  assert.strictEqual('V1', await token3.getLibraryVersion());

  console.log('Calling transferPercent');
  assert.strictEqual('10000', (await token3.balanceOf(ownerAddress)).toString());
  await token3.transferPercent(testAddress, 10);
  assert.strictEqual('1000', (await token3.balanceOf(testAddress)).toString());
  assert.strictEqual('9000', (await token3.balanceOf(ownerAddress)).toString());
}

// linkBytecode: performs linking by replacing placeholders with deployed addresses
// Recommended workaround from Buidler team until linking feature is implemented
// https://github.com/nomiclabs/buidler/issues/611#issuecomment-638891597
function linkBytecode(artifact, libraries) {
  let bytecode = artifact.bytecode;
  for (const [, fileReferences] of Object.entries(artifact.linkReferences)) {
    for (const [libName, fixups] of Object.entries(fileReferences)) {
      const addr = libraries[libName];
      if (addr === undefined) {
        continue;
      }
      for (const fixup of fixups) {
        bytecode =
          bytecode.substr(0, 2 + fixup.start * 2) +
          addr.substr(2) +
          bytecode.substr(2 + (fixup.start + fixup.length) * 2);
      }
    }
  }
  return bytecode;
}

async function deployLibrary(libraryName) {
  const Library = await ethers.getContractFactory(libraryName);
  const library = await Library.deploy();
  await library.deployed();
  return library;
}

async function getLinkedContractFactory(contractName, libraries) {
  const cArtifact = await readArtifact(config.paths.artifacts, contractName);
  const linkedBytecode = linkBytecode(cArtifact, libraries);
  const ContractFactory = await ethers.getContractFactory(cArtifact.abi, linkedBytecode);
  return ContractFactory;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
withoutFlag()
  .then(() => {
    // this should not happen
    console.error('Expected failure did not happen');
    process.exit(1);
  })
  .catch(error => {
    console.error(error);
    return withFlag();
  })
  .then(() => process.exit(0))
  .catch(error => {
    // this should not happen
    console.error(error);
    process.exit(1);
  });
