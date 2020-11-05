require('@nomiclabs/buidler-ethers');
require('@openzeppelin/buidler-upgrades');

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
module.exports = {
  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: '0.5.15',
  },
};
