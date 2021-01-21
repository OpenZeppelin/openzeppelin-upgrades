const { ethers, upgrades, defender } = require('hardhat');

async function deploy() {
  console.log(`Deploying Greeter contract...`);
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await upgrades.deployProxy(Greeter).then(c => c.deployed());
  console.log(` ${greeter.address}`);
}

async function transferOwnership() {
  const newOwner = process.env.OWNER_ADDRESS;
  if (!newOwner) {
    return;
  }
  console.log(`Transferring ownership to ${newOwner}...`);
  await upgrades.admin.transferProxyAdminOwnership(newOwner);
  console.log(` Completed`);
}

async function proposeUpgrade(contract) {
  console.log(`Proposing upgrade to V2...`);
  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const proposal = await defender.proposeUpgrade(contract.address, GreeterV2);
  console.log(` ${proposal.url}`);
}

// eslint-disable-next-line no-unused-vars
async function loadContract(address) {
  return ethers.getContractFactory('Greeter').then(f => f.attach(address));
}

async function main() {
  const contract = await deploy();
  await transferOwnership(contract);
  await proposeUpgrade(contract);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
