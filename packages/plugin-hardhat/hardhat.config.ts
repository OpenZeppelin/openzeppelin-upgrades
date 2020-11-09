import '@nomiclabs/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
export default {
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    version: '0.5.15',
  },
};
