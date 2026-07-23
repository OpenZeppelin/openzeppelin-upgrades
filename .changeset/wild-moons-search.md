---
'@openzeppelin/hardhat-upgrades': minor
---

Add a viem-based API at `@openzeppelin/hardhat-upgrades/viem`, following `@nomicfoundation/hardhat-viem` conventions: contracts are identified by name, addresses are typed as `` `0x${string}` ``, and the returned contract instances are viem contract instances.
- To use the viem-based API, install `viem` and `@nomicfoundation/hardhat-viem`, then import both the plugin (for your Hardhat config's `plugins` array) and the API (for your scripts) from `@openzeppelin/hardhat-upgrades/viem`. It supports wallet clients backed by local accounts, such as viem's `privateKeyToAccount`. The `proxyFilesToBuild` helper for Solidity tests is also exported from this entry point, so viem-only projects can configure `npmFilesToBuild` without importing the ethers-typed root entry.
- The ethers-based API is unchanged. Import its plugin and API from `@openzeppelin/hardhat-upgrades` as before, or from the new `@openzeppelin/hardhat-upgrades/ethers` alias.
- **Potentially breaking changes**: `ethers` and `@nomicfoundation/hardhat-ethers` are now optional peer dependencies, required only by the ethers-based API; viem-only projects no longer need them. If you use the ethers-based API, install them explicitly with `npm install --save-dev @nomicfoundation/hardhat-ethers ethers`. Previously they were required peer dependencies that package managers installed automatically.
