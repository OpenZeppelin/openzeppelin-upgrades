const test = require('ava');

const { ethers, upgrades, artifacts } = require('hardhat');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

upgrades.silenceWarnings();

test('without flag', async t => {
  // Deploying library
  const safeMathLib = await deployLibrary('SafeMath');

  // Attempting to Deploy Token
  const Token = await getLinkedContractFactory('Token', { SafeMath: await safeMathLib.getAddress() });
  await t.throwsAsync(
    () => upgrades.deployProxy(Token, ['TKN', 10000], { kind: 'transparent' }),
    undefined,
    'Contract `Token` is not upgrade safe',
  );
});

test('with flag', async t => {
  const accounts = await ethers.getSigners();
  const ownerAddress = await accounts[0].getAddress();

  // Deploying libraries
  const safeMathLib = await deployLibrary('SafeMath');
  const safeMathLib2 = await deployLibrary('SafeMathV2');
  const safePctLib = await deployLibrary('SafePercent');

  // Deploying Token
  const Token = await getLinkedContractFactory('Token', { SafeMath: await safeMathLib.getAddress() });
  const token = await upgrades.deployProxy(Token, ['TKN', 10000], {
    kind: 'transparent',
    unsafeAllow: ['external-library-linking'],
  });

  t.is('10000', (await token.totalSupply()).toString());
  t.is('V1', await token.getLibraryVersion());

  // Deploying Token with different Library
  const TokenNew = await getLinkedContractFactory('Token', { SafeMath: await safeMathLib2.getAddress() });
  const tokenNew = await upgrades.deployProxy(TokenNew, ['TKN', 5000], {
    kind: 'transparent',
    unsafeAllow: ['external-library-linking'],
  });

  t.is('5000', (await tokenNew.totalSupply()).toString());
  t.is('V2', await tokenNew.getLibraryVersion());

  // Attempting to upgrade to TokenV2 using same library
  const TokenV2 = await getLinkedContractFactory('TokenV2', { SafeMath: await safeMathLib.getAddress() });
  const token2 = await upgrades.upgradeProxy(token, TokenV2, {
    unsafeAllow: ['external-library-linking'],
  });

  t.is(await token.getAddress(), await token2.getAddress());
  t.is('10000', (await token2.totalSupply()).toString());
  t.is('V1', await token2.getLibraryVersion());

  // Attempting to upgrade to same TokenV2 using different library
  const TokenV2New = await getLinkedContractFactory('TokenV2', { SafeMath: await safeMathLib2.getAddress() });
  const token2New = await upgrades.upgradeProxy(token, TokenV2New, {
    unsafeAllow: ['external-library-linking'],
  });

  t.is(await token.getAddress(), await token2New.getAddress());
  t.is('10000', (await token2New.totalSupply()).toString());
  t.is('V2', await token2New.getLibraryVersion());

  // Attempting to upgrade to LibraryTesterV3 using multiple libraries
  const TokenV3 = await getLinkedContractFactory('TokenV3', {
    SafeMath: await safeMathLib.getAddress(),
    SafePercent: await safePctLib.getAddress(),
  });
  const token3 = await upgrades.upgradeProxy(token, TokenV3, {
    unsafeAllow: ['external-library-linking'],
  });

  t.is(await token.getAddress(), await token3.getAddress());
  t.is('10000', (await token3.totalSupply()).toString());
  t.is('V1', await token3.getLibraryVersion());

  // Calling transferPercent
  t.is('10000', (await token3.balanceOf(ownerAddress)).toString());
  await token3.transferPercent(testAddress, 10);
  t.is('1000', (await token3.balanceOf(testAddress)).toString());
  t.is('9000', (await token3.balanceOf(ownerAddress)).toString());
});

// linkBytecode: performs linking by replacing placeholders with deployed addresses
// Recommended workaround from Hardhat team until linking feature is implemented
// https://github.com/nomiclabs/hardhat/issues/611#issuecomment-638891597
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
  await library.waitForDeployment();
  return library;
}

async function getLinkedContractFactory(contractName, libraries) {
  const cArtifact = await artifacts.readArtifact(contractName);
  const linkedBytecode = linkBytecode(cArtifact, libraries);
  const ContractFactory = await ethers.getContractFactory(cArtifact.abi, linkedBytecode);
  return ContractFactory;
}
