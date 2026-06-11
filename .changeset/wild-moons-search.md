---
'@openzeppelin/hardhat-upgrades': minor
---

Add a viem-based API at `@openzeppelin/hardhat-upgrades/viem`. It provides the same functions as the ethers-based API following `@nomicfoundation/hardhat-viem` conventions: contracts are identified by their names, addresses are typed as `` `0x${string}` ``, and the returned contract instances are viem contract instances. Requires registering the `@nomicfoundation/hardhat-viem` plugin, which is a new optional peer dependency along with `viem`.
