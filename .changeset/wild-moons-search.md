---
'@openzeppelin/hardhat-upgrades': minor
---

Add a viem-based API at `@openzeppelin/hardhat-upgrades/viem`. It provides the same functions as the ethers-based API following `@nomicfoundation/hardhat-viem` conventions: contracts are identified by their names, addresses are typed as `` `0x${string}` ``, and the returned contract instances are viem contract instances. Requires registering the `@nomicfoundation/hardhat-viem` plugin, which is a new optional peer dependency along with `viem`. The viem-based API signs through viem itself, so wallet clients backed by local accounts (such as viem's `privateKeyToAccount`, mnemonic, KMS, or hardware accounts) are supported.

Internally, the plugin is now built on a client-neutral engine with thin ethers and viem bindings, so each flavor depends only on its own client packages. As a result, `@nomicfoundation/hardhat-ethers` and `ethers` are now optional peer dependencies: viem-only projects no longer need them. The plugin still auto-loads `@nomicfoundation/hardhat-ethers` when it is installed, so ethers users do not need to register it. The ethers-based API requires both packages and reports an actionable error if they are missing. The plugin object is also exported from `@openzeppelin/hardhat-upgrades/viem` (and a new `@openzeppelin/hardhat-upgrades/ethers` alias), so a viem-only Hardhat config can register the plugin without resolving the ethers types.

If you use the ethers-based API and were relying on `npm` automatically installing the previously-required peer dependencies, install them explicitly: `npm install --save-dev @nomicfoundation/hardhat-ethers ethers`.
