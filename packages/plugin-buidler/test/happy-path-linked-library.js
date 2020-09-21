const { ethers, upgrades, config } = require('@nomiclabs/buidler');
const { readArtifact } = require('@nomiclabs/buidler/plugins');

async function withoutFlag() {
  const Adder = await ethers.getContractFactory('Adder');
  const adder = await upgrades.deployProxy(Adder);

  console.log('Attempting upgrade to AdderV3...');
  const Library = await ethers.getContractFactory('SafeAddExternal');
  const library = await Library.deploy();
  await library.deployed();

  const cArtifact = await readArtifact(config.paths.artifacts, 'AdderV3');
  const linkedBytecode = linkBytecode(cArtifact, { SafeAddExternal: library.address });
  const AdderV3 = await ethers.getContractFactory(cArtifact.abi, linkedBytecode);

  const adder3 = await upgrades.upgradeProxy(adder.address, AdderV3);
  await adder3.deployed();

  console.log('Adding...');
  await adder3.add(1);
}

async function withFlag() {
  const Adder = await ethers.getContractFactory('Adder');
  const adder = await upgrades.deployProxy(Adder);

  console.log('Attempting upgrade to AdderV3...');
  const Library = await ethers.getContractFactory('SafeAddExternal');
  const library = await Library.deploy();
  await library.deployed();

  const cArtifact = await readArtifact(config.paths.artifacts, 'AdderV3');
  const linkedBytecode = linkBytecode(cArtifact, { SafeAddExternal: library.address });
  const AdderV3 = await ethers.getContractFactory(cArtifact.abi, linkedBytecode);

  const adder3 = await upgrades.upgradeProxy(adder.address, AdderV3, { unsafeAllowLinkedLibraries: true });
  await adder3.deployed();

  console.log('Adding...');
  await adder3.add(1);
}

// linkBytecode: performs linking by replacing placeholders with deployed addresses
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
