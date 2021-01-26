const { ethers, upgrades, defender } = require('hardhat');

// Deploys an upgradeable Greeter contract
async function deploy() {
  console.log(`Deploying upgradeable Greeter contract...`);
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await upgrades.deployProxy(Greeter).then(c => c.deployed());
  console.log(` ${greeter.address}`);
  return greeter;
}

// Transfers ownership of the project to a multisig wallet set in OWNER_ADDRESS
async function transferOwnership() {
  const newOwner = process.env.OWNER_ADDRESS;
  if (!newOwner) {
    return;
  }
  const adminOwner = await upgrades.admin.getInstance().then(c => c.owner());
  if (adminOwner.toLowerCase() === newOwner.toLowerCase()) {
    return;
  }

  console.log(`Transferring ownership to ${newOwner}...`);
  await upgrades.admin.transferProxyAdminOwnership(newOwner);
  console.log(` Completed`);
}

// Proposes an upgrade to GreeterV2 via the multisig contract in Defender
async function proposeUpgrade(contract) {
  console.log(`Proposing upgrade to V2...`);
  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const proposal = await defender.proposeUpgrade(contract.address, GreeterV2);
  console.log(` ${proposal.url}`);
}

// Load deployed Greeter contract given its address
async function loadContract(address) {
  return ethers.getContractFactory('Greeter').then(f => f.attach(address));
}

async function main() {
  const address = process.env.ADDRESS;
  const contract = await (address ? loadContract(address) : deploy());
  await transferOwnership(contract);
  await proposeUpgrade(contract);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
