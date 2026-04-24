---
'@openzeppelin/upgrades-core': minor
---

Support Hardhat 3 build-info file format for CLI validation.
- Handle the split `.json` / `.output.json` file format used by Hardhat 3.
- Improve support for validating build-info files in the CLI across Hardhat 3, Hardhat 2, and Foundry.
- Improve error handling for Hardhat 3 `.output.json` files.
