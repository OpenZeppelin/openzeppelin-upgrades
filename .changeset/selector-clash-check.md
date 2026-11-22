---
'@openzeppelin/upgrades-core': minor
'@openzeppelin/hardhat-upgrades': minor
---

Add upgrade safety check for function selector clashes between the previous and new implementation, reported as `selector-clash`. It runs in the `validate` CLI command when a reference contract is used, and in `validateUpgrade` when given two contracts. Use `unsafeAllow: ['selector-clash']` to skip. Public state variable getters are not included, and `validateUpgrade` with an address, `upgradeProxy` and `prepareUpgrade` do not run this check.
