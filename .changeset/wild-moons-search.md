---
'@openzeppelin/hardhat-upgrades': minor
---

Add a viem-based API at `@openzeppelin/hardhat-upgrades/viem`, following `@nomicfoundation/hardhat-viem` conventions: contracts are identified by name, addresses are typed as `` `0x${string}` ``, and the returned contract instances are viem contract instances.
- The viem-based API signs through viem, so wallet clients backed by local accounts (such as viem's `privateKeyToAccount`) are supported.
- `ethers` and `@nomicfoundation/hardhat-ethers` are now optional peer dependencies, used only by the ethers-based API. viem-only projects no longer need them.
- The `@openzeppelin/hardhat-upgrades` plugin (the default export added to your Hardhat config's `plugins` array) can now be imported from `@openzeppelin/hardhat-upgrades/viem`, and from a new `@openzeppelin/hardhat-upgrades/ethers` alias, so that a viem-only project can register it without resolving the ethers-based type declarations.
- **Breaking change**: If you use the ethers-based API, install `ethers` and `@nomicfoundation/hardhat-ethers` explicitly with `npm install --save-dev @nomicfoundation/hardhat-ethers ethers`. They were previously required peer dependencies that package managers installed automatically.
