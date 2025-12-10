/**
 * Returns an array of OpenZeppelin contract file paths that are used in tests.
 *
 * These contracts are essential proxy and beacon implementations used for testing
 * upgrade patterns. If you want to test with these contracts in your Solidity code,
 * you must add them to the `npmFilesToBuild` configuration in your `hardhat.config.ts`.
 *
 * @see {@link https://hardhat.org/docs/cookbook/npm-artifacts} for more information on npm artifacts configuration
 *
 * @returns {string[]} An array of file paths to OpenZeppelin proxy and beacon contracts
 */
export function OZfilesToBuild(): string[] {
  return [
    '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol',
    '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol',
    '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol',
    '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
    '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol',
  ];
}
