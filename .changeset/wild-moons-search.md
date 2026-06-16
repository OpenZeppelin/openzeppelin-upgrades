---
'@openzeppelin/hardhat-upgrades': minor
---

Add a viem-based API at `@openzeppelin/hardhat-upgrades/viem`, following `@nomicfoundation/hardhat-viem` conventions: contracts are identified by name, addresses are typed as `` `0x${string}` ``, and the returned contract instances are viem contract instances.
- The viem-based API signs through viem, so wallet clients with local accounts (`privateKeyToAccount`, mnemonic, KMS, hardware) are supported.
- `ethers` and `@nomicfoundation/hardhat-ethers` are now optional peer dependencies, needed only by the ethers-based API and still auto-loaded when installed. If you use the ethers-based API and relied on them being installed automatically, install them explicitly: `npm install --save-dev @nomicfoundation/hardhat-ethers ethers`.
- The plugin object is also exported from `@openzeppelin/hardhat-upgrades/viem` and a new `@openzeppelin/hardhat-upgrades/ethers` alias, so a viem-only project can register the plugin without resolving the ethers types.
