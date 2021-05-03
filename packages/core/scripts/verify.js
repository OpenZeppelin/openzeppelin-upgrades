/// <reference types="@nomiclabs/hardhat-ethers" />

const hre = require('hardhat');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

async function deployAndVerify(contractName, constructorArguments = []) {
  const factory = await hre.ethers.getContractFactory(contractName);
  console.log('deploying', contractName, '...');
  const contract = await factory.deploy(...constructorArguments);
  console.log('deploying', contractName, 'at', contract.address);
  await contract.deployed();
  if (hre.network.name !== 'hardhat') {
    const { sourceName }  = await hre.artifacts.readArtifact(contractName);
    const maxErrors = 5;
    let errors = [];
    while (errors.length < maxErrors) {
      try {
        await hre.run('verify:verify', {
          address: contract.address,
          constructorArguments,
          contract: sourceName + ':' + contractName,
        });
        break;
      } catch (e) {
        if (e.message.includes('Contract source code already verified')) {
          break;
        } else {
          errors.push(e);
        }
      }
      console.log('contract not yet deployed. waiting...');
      await sleep(8000);
    }

    if (errors.length === maxErrors) {
      throw errors[maxErrors - 1];
    }
  }
  return contract.address;
}

async function main() {
  const adminAddress = await deployAndVerify('ProxyAdmin');
  await deployAndVerify('AdminUpgradeabilityProxy', [adminAddress, adminAddress, '0x']);
  await deployAndVerify('TransparentUpgradeableProxy', [adminAddress, adminAddress, '0x']);
  await deployAndVerify('ERC1967Proxy', [adminAddress, '0x']);
}

main().catch(e => {
  console.log(e);
  process.exit(1);
});
