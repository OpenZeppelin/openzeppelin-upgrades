# Changelog

## 3.1.1 (2024-06-03)

- Defender: Fix proxy deployments when using `constructorArgs` option, support arbitrary constructor arguments. ([#1029](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/1029))

## 3.1.0 (2024-04-22)

- Defender: Fix handling of license types for block explorer verification, support `licenseType` and `skipLicenseType` options. ([#1013](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/1013))

### Breaking changes
- When deploying through Defender, if your contract does not have an SPDX license identifier, the verified source code on Etherscan will no longer show any license type.
  - If you want the license type to appear as "None", either set your contract to have `// SPDX-License-Identifier: UNLICENSED` according to [Solidity docs](https://docs.soliditylang.org/en/latest/layout-of-source-files.html#spdx-license-identifier), or set the `licenseType` option to `"None"`.

## 3.0.5 (2024-03-08)

- Simplify console logging for `admin.transferProxyAdminOwnership`. ([#978](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/978))
- Support private networks and forked networks with Defender. ([#989](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/989))

## 3.0.4 (2024-02-27)

- Support externally linked libraries for Defender deployments. ([#960](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/960))

## 3.0.3 (2024-02-06)

- Support Defender deployments using EOA or Safe. ([#967](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/967))

## 3.0.2 (2024-01-09)

- Support proxy verification on Snowtrace. ([#954](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/954))

## 3.0.1 (2023-12-20)

- Update dependency on undici. ([#948](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/948))
- Update Defender SDK, support `txOverrides` option with Defender. ([#951](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/951))

## 3.0.0 (2023-12-11)

- Deploy proxies from OpenZeppelin Contracts 5.0. ([#919](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/919))
- Support `initialOwner` option when deploying a transparent proxy or beacon. If not set, the externally owned account used during deployment will be the default owner for the transparent proxy's admin or the beacon, respectively.
- Update optional peer dependency on `@nomicfoundation/hardhat-verify` to v2.0.0 or higher. ([#937](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/937))
  - **Note**: [Fully verifying proxies](https://docs.openzeppelin.com/upgrades-plugins/1.x/api-hardhat-upgrades#verify) is only supported with Etherscan at the moment. The Hardhat Upgrades plugin does not currently assist with Sourcify verification for proxies.

### Breaking changes
- `deployProxy`, `deployBeacon`, `deployBeaconProxy`: Deploys proxy contracts from [OpenZeppelin Contracts 5.0](https://docs.openzeppelin.com/contracts/5.x/api/proxy).
- `deployProxy`:
  - Deploying a transparent proxy automatically causes a new proxy admin contract to be deployed along with the proxy.
  - New transparent proxy deployments no longer use an existing proxy admin, even if one was previously recorded in the network file.
  - New proxy admins are no longer recorded in the network file.
- `deployProxyAdmin`: Removed, since proxy admins are deployed automatically by transparent proxies.
- `admin.changeProxyAdmin`: Not supported with admins or proxies from OpenZeppelin Contracts 5.0. Only supported for previously deployed admins and proxies from OpenZeppelin Contracts 4.x or below.
- `admin.transferProxyAdminOwnership`: This function no longer uses the proxy admin from the network file. It now requires a `proxyAddress` argument to be passed in.
- `@nomicfoundation/hardhat-verify` v1.x and `@nomicfoundation/hardhat-toolbox` v3.x are no longer supported with this plugin. If you are using these packages, update them to `@nomicfoundation/hardhat-verify` v2.x and `@nomicfoundation/hardhat-toolbox` v4.x.

## 2.5.0 (2023-12-04)

- Add `defender.getDeployApprovalProcess` and `defender.getUpgradeApprovalProcess` functions. ([#934](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/934))
- Deprecate `defender.getDefaultApprovalProcess` function. This function is equivalent to `defender.getUpgradeApprovalProcess`.

**Note**: OpenZeppelin Defender deployments is in beta and its functionality is subject to change.

## 2.4.3 (2023-11-28)

- Bump dependency on `@openzeppelin/upgrades-core`. ([#930](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/930))

## 2.4.2 (2023-11-28)

- Fix `upgradeProxy` from an implementation that has a fallback function and is not using OpenZeppelin Contracts 5.0. ([#926](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/926))

## 2.4.1 (2023-11-14)

- Update Defender SDK. ([#924](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/924))
- Throw error if not using a relayer for deployments, until other types of deployments are supported.

**Note**: OpenZeppelin Defender deployments is in beta and its functionality is subject to change.

## 2.4.0 (2023-11-13)

- Add `createFactoryAddress` option for Defender deployments. ([#920](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/920))

**Note**: OpenZeppelin Defender deployments is in beta and its functionality is subject to change.

## 2.3.3 (2023-10-12)

- Update OpenZeppelin Defender deployments to use Defender SDK ([#888](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/888))

## 2.3.2 (2023-10-11)

- Fix Hardhat compile error when using Solidity 0.5.x. ([#892](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/892))

## 2.3.1 (2023-09-28)

- Check for non-zero admin address when importing transparent proxy. ([#887](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/887))

## 2.3.0 (2023-09-27)

- Support new upgrade interface in OpenZeppelin Contracts 5.0. ([#883](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/883))
- Support importing and upgrading 5.0 proxies.
  - **Note**: Deploying 5.0 proxies is not supported yet.
- Add validations for namespaced storage layout. ([#876](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/876))

## 2.2.1 (2023-08-18)

- Allow using proxy with different admin address than manifest. ([#859](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/859))

## 2.2.0 (2023-08-17)

- Rename Platform to Defender. ([#863](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/863))

**Note**: Functions that were for OpenZeppelin Platform have breaking changes since the previous release and have been renamed for OpenZeppelin Defender. See ([#863](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/863)) for details. OpenZeppelin Defender deployments is in beta and its functionality is subject to change.

## 2.1.1 (2023-08-08)

- Use public Etherscan API from `hardhat-verify`. ([#857](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/857))

## 2.1.0 (2023-08-03)

- Add `txOverrides` option for overriding transaction parameters. ([#852](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/852))

## 2.0.2 (2023-07-26)

- Enable storage layout for overrides from Hardhat config. ([#851](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/851))

## 2.0.1 (2023-07-12)

- Update OpenZeppelin Platform client dependencies. ([#845](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/845))

## 2.0.0 (2023-07-05)

- Use `ethers` v6 and `hardhat-ethers` v3. ([#817](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/817))
- Use `hardhat-verify` for proxy verification. ([#829](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/829))
- Remove address override for deployments. ([#832](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/832))

### Breaking changes
This new major version requires `ethers` v6 and `@nomicfoundation/hardhat-ethers` v3 as peer dependencies.  
For Etherscan verification, it also requires `@nomicfoundation/hardhat-verify`.

### How to update from a previous version
Update your existing project according to [Hardhat Toolbox v3's release notes](https://github.com/NomicFoundation/hardhat/releases/tag/%40nomicfoundation%2Fhardhat-toolbox%403.0.0).  
Then update this plugin, for example: `npm install @openzeppelin/hardhat-upgrades@latest`

## 1.28.0 (2023-06-14)

- **Breaking change**: Rename `walletId` option to `relayerId` for OpenZeppelin Platform deployments. Update dependencies. ([#806](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/806))

**Note**: OpenZeppelin Platform is in beta and its functionality is subject to change.

## 1.27.0 (2023-05-26)

- Support `salt` option for deployments on OpenZeppelin Platform. ([#799](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/799))
- Add `redeployImplementation` option, deprecate `useDeployedImplementation`. ([#804](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/804))

**Note**: OpenZeppelin Platform is in beta and its functionality is subject to change.

## 1.26.0 (2023-05-15)

- **Breaking change**: Improve OpenZeppelin Platform functions. ([#791](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/791))

**Note**: Some OpenZeppelin Platform functions have breaking changes since the previous release. See ([#791](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/791)) for details. OpenZeppelin Platform is in beta and its functionality is subject to change.

## 1.25.3 (2023-05-12)

- Add missing file in package. ([#797](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/797))

## 1.25.2 (2023-05-12)

- Use proxies from OpenZeppelin Contracts 4.8.3. ([#795](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/795))

## 1.25.1 (2023-05-10)

- Fix type error with `platform.deployContract`. ([#793](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/793))

## 1.25.0 (2023-05-08)

- Enable using OpenZeppelin Platform for deployments. ([#763](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/763))

**Note**: OpenZeppelin Platform is in beta and its functionality is subject to change.

## 1.24.0 (2023-05-03)

- Support custom signer for `admin` functions. ([#784](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/784))

## 1.23.1 (2023-04-26)

- Enable `verify` to fall back to hardhat-etherscan if proxy bytecode does not match. ([#752](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/752))

## 1.23.0 (2023-04-26)

- Support `prepareUpgrade` from an implementation address. ([#777](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/777))

## 1.22.1 (2023-01-18)

- Handle getLogs error for Blockscout explorer. ([#706](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/706))

## 1.22.0 (2022-12-15)

- Enable `verify` to verify beacons. ([#695](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/695))

## 1.21.0 (2022-09-27)

- Include solc version in storage layouts in manifest files. ([#662](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/662))

## 1.20.1 (2022-09-26)

- Override `verify:verify` subtask from hardhat-etherscan. ([#619](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/619))

**Breaking change**: To verify a proxy on Etherscan programmatically from a Hardhat script, call `verify:verify` instead of `verify`:
```
await hre.run("verify:verify", {
  address: PROXY_ADDRESS,
});
```

## 1.20.0 (2022-08-08)

- Provide granular functions to allow more customizable deployments. ([#580](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/580))

## 1.19.1 (2022-07-26)

- Add dependencies on `debug` and `ethers`. ([#600](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/600))
- Improve check for admin contract in `upgradeProxy`. ([#604](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/604))

## 1.19.0 (2022-06-16)

- Return ethers transaction response with `proposeUpgrade`. ([#554](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/554))

## 1.18.3 (2022-06-14)

- Fix dependency on hardhat-etherscan.

## 1.18.2 (2022-06-14)

- Update `verify` to be compatible with latest version of hardhat-etherscan. ([#592](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/592))

## 1.18.1 (2022-06-03)

- Fix task redefinition error with hardhat-etherscan. ([#586](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/586))

## 1.18.0 (2022-05-31)

- Support verifying a proxy on Etherscan using Hardhat. ([#579](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/579))

## 1.17.0 (2022-03-29)

- Support specifying proxy kind for `forceImport`, fix importing UUPS proxy with admin ([#550](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/550))

## 1.16.1 (2022-03-15)

- Fix lock file issue with validations cache when compiling a large number of contracts ([#537](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/537))

## 1.16.0 (2022-03-08)

- Use a lockfile when reading validations cache to avoid problems with parallel compilation in Hardhat 2.9.0. ([#530](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/530))
- Add an option `unsafeSkipStorageCheck` to skip storage layout compatibility check during upgrades. ([#495](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/495))

## 1.15.0 (2022-03-01)

- Add `forceImport` function to import an existing proxy or beacon. ([#517](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/517))
- Extract and store more detailed information about storage layout. ([#519](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/519))

## 1.14.0 (2022-01-31)

- Add options `timeout` and `pollingInterval`. ([#55](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/55))

## 1.13.0 (2022-01-12)

- Add support for beacon proxies. ([#342](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/342))

## 1.12.1 (2022-01-06)

- Fix issues when deploying to Polygon Mumbai testnet. ([#487](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/487))

## 1.12.0 (2021-10-28)

- Add support for `upgradeToAndCall` to batch a function call into the upgrade transaction. ([#443](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/443))

## 1.11.0 (2021-10-22)

- Infer whether a proxy should be UUPS or Transparent. ([#441](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/441))
- Add implementation constructor arguments to initialize immutable variables. ([#433](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/433))

## 1.10.0 (2021-08-25)

- Add `erc1967` module. ([#413](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/413))

## 1.9.0 (2021-06-29)

- Add option `unsafeAllowRenames` to configure storage layout check to allow variable renaming.

## 1.8.2 (2021-05-13)

- Simplify `deployTransaction` assignment in `deployProxy` as a fix for congested networks.

## 1.8.1 (2021-05-13)

- Simplify `deployTransaction` assignment in `upgradeProxy`.

## 1.8.0 (2021-05-12)

- Support passing contract instance to `upgradeProxy` and `prepareUpgrade`.
- Enable awaiting until a proxy upgrade is mined:

```
const v2 = await upgrades.upgradeProxy(proxy, ContractV2);
await v2.deployed();
```

## 1.7.0 (2021-04-29)

- Add support for UUPS proxies. ([#315](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/315))

## 1.6.0 (2021-01-27)

- Add support for structs and enums. ([#261](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/261))

## 1.5.0 (2021-01-15)

- Add `upgrades.admin.getInstance()` to retrieve the instance of `ProxyAdmin` that is in use. ([#274](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/274))

## 1.4.3 (2020-12-16)

- Fix an error in the `unsafeAllowCustomTypes` flag that would cause other storage layout incompatibilities to be ignored. ([#259](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/259))

Users of this flag are advised to update to this version.

## 1.4.2 (2020-12-04)

- Fix a bug that prevented some solc errors from reaching the console. ([#253](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/253))

## 1.4.1 (2020-11-30)

- Add `admin` to the TypeScript type for `hre.upgrades`.

## 1.4.0 (2020-11-24)

- Add `silenceWarnings` to emit a single warning and silence all subsequent ones. ([#228](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/228))

## 1.3.1 (2020-11-18)

- Allow ommitting `args` in `deployProxy` when it's an empty array.

## 1.3.0 (2020-11-13)

- Migrate plugin to Hardhat. ([#214](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/214))

## 1.2.1 (2020-10-21)

- Add ability to disable proxy initialization by specifying `initializer: false`. ([#204](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/204))

## 1.2.0 (2020-10-16)

- Add new flag `unsafeAllowLinkedLibraries` to allow deployment of contracts with linked libraries. ([#182](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/182))

## 1.1.1 (2020-10-08)

- Add prepareUpgrade to Buidler type extensions. ([#184](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/184))
- Fix OpenZeppelin CLI migration for projects that were initialized with ZeppelinOS. ([#193](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/193))

## 1.1.0 (2020-09-18)

- Add a script to migrate from OpenZeppelin CLI. ([#143](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/143))

## 1.0.2 (2020-09-01)

- Include `src` directory in npm packages. ([#150](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/150))

## 1.0.1 (2020-08-20)

- Store transaction hash in contract instances returned by `deployProxy`. ([#129](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/129), [#133](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/133))
