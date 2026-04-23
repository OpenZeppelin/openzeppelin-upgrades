---
'@openzeppelin/hardhat-upgrades': major
---

Migrate to Hardhat 3 with ESM module structure and plugin hooks architecture.

### Breaking Changes

- **Requires Hardhat 3**: minimum `hardhat@^3.0.0` required.
- **ESM-only**: package converted to ESM; CommonJS is no longer supported.
- **API Changes**:
  - No automatic `hre.upgrades` — call the `upgrades(hre, connection)` factory explicitly.
  - Factory functions (`upgrades`, `defender`) are async and require a network connection.
  - Network connection must be explicitly created: `const connection = await hre.network.connect()`. Share one connection across operations.
  - `ethers` now comes from the connection (`const { ethers } = connection`), not `hre.ethers`.
- **Import Changes**: import factory functions instead of a side-effect import.
  - Before: `import '@openzeppelin/hardhat-upgrades'`
  - After: `import { upgrades, defender } from '@openzeppelin/hardhat-upgrades'`

### Usage and Migration

See the [README](./README.md) for Hardhat 3 usage, the [examples](./examples/README.md) directory for sample projects, and the [Migration Guide](./MIGRATION.md) for Hardhat 2 to 3 migration steps.

### Changes

- Migrated from `extendEnvironment` to Hardhat 3's `HardhatPlugin` with `hookHandlers`.
- Converted package to ESM.
- Etherscan verification requires `@nomicfoundation/hardhat-verify@^3.0.10` (optional peer dependency).
- Support [Solidity tests in Hardhat 3](./README.md#solidity-tests) with `@openzeppelin/foundry-upgrades`.
- Added example projects for Hardhat 3 (Transparent, UUPS, and Solidity-test scaffolds under `packages/plugin-hardhat/examples/`).
