// The `/ethers` entry point is a modern, symmetric alias of the main entry point (which remains
// the unchanged legacy ethers entry). It exposes the same plugin object, ethers-flavored API, and
// type extensions, so that ethers users may import from either `@openzeppelin/hardhat-upgrades`
// or `@openzeppelin/hardhat-upgrades/ethers`.
export * from './index.js';
export { default } from './index.js';
