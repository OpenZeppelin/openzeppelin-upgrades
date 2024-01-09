# Changelog

## 1.21.0 (2023-09-27)

> **Warning**
> This package is deprecated. Use [Hardhat](https://hardhat.org/) and [Hardhat Upgrades](https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades), or [Foundry](https://github.com/foundry-rs/foundry) and [Foundry Upgrades](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades).

- Add validations for namespaced storage layout. ([#876](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/876))

## 1.20.1 (2023-08-18)

- Allow using proxy with different admin address than manifest. ([#859](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/859))

## 1.20.0 (2023-08-03)

- Add `txOverrides` option for overriding transaction parameters. ([#852](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/852))

## 1.19.0 (2023-05-26)

- Add `redeployImplementation` option, deprecate `useDeployedImplementation`. ([#804](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/804))

## 1.18.2 (2023-05-12)

- Add missing file in package. ([#797](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/797))

## 1.18.1 (2023-05-12)

- Use proxies from OpenZeppelin Contracts 4.8.3. ([#795](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/795))

## 1.18.0 (2023-04-26)

- Support `prepareUpgrade` from an implementation address. ([#777](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/777))

## 1.17.1 (2023-03-03)

- Use proxy transaction hash for implementation contract abstraction. ([#737](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/737))

## 1.17.0 (2022-09-27)

- Include solc version in storage layouts in manifest files. ([#662](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/662))

## 1.16.0 (2022-08-08)

- Provide granular functions to allow more customizable deployments. ([#580](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/580))

## 1.15.1 (2022-07-26)

- Add dependencies on `debug` and `ethers`. ([#600](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/600))
- Improve check for admin contract in `upgradeProxy`. ([#604](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/604))

## 1.15.0 (2022-03-29)

- Fix "The requested contract was not found" error when importing from an interface ([#549](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/549))
- Support specifying proxy kind for `forceImport`, fix importing UUPS proxy with admin ([#550](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/550))

## 1.14.0 (2022-03-08)

- Add an option `unsafeSkipStorageCheck` to skip storage layout compatibility check during upgrades. ([#495](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/495))

## 1.13.0 (2022-03-01)

- Add `forceImport` function to import an existing proxy or beacon. ([#517](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/517))

## 1.12.0 (2022-01-12)

- Add support for beacon proxies. ([#342](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/342))

## 1.11.0 (2021-10-28)

- Add support for `upgradeToAndCall` to batch a function call into the upgrade transaction. ([#443](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/443))

## 1.10.0 (2021-10-22)

- Infer whether a proxy should be UUPS or Transparent. ([#441](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/441))
- Add implementation constructor arguments to initialize immutable variables. ([#433](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/433))

## 1.9.1 (2021-08-31)

- Make options argument optional in `erc1967` functions.

## 1.9.0 (2021-08-25)

- Add `erc1967` module. ([#413](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/413))

## 1.8.1 (2021-08-12)

- Bump required version of `@truffle/contract`.

## 1.8.0 (2021-06-29)

- Add option `unsafeAllowRenames` to configure storage layout check to allow variable renaming.

## 1.7.1 (2021-06-14)

- Prioritize `sendAsync` over `send` in the provider.

## 1.7.0 (2021-05-12)

- Support passing contract instance to `upgradeProxy` and `prepareUpgrade`.

## 1.6.1 (2021-05-03)

- Ignore non-JSON files in artifacts directory.

## 1.6.0 (2021-04-29)

- Add support for UUPS proxies. ([#315](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/315))

## 1.5.2 (2021-04-20)

- Support using Web3 ProviderEngine providers.

## 1.5.1 (2021-04-14)

- Add support for new `unsafeAllow` option in `@openzeppelin/upgrades-core`.

## 1.5.0 (2021-01-27)

- Add support for structs and enums. ([#261](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/261))

## 1.4.0 (2021-01-15)

- Add `upgrades.admin.getInstance()` to retrieve the instance of `ProxyAdmin` that is in use. ([#274](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/274))

## 1.3.1 (2020-12-16)

- Fix an error in the `unsafeAllowCustomTypes` flag that would cause other storage layout incompatibilities to be ignored. ([#259](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/259))

Users of this flag are advised to update to this version.

## 1.3.0 (2020-11-24)

- Add `silenceWarnings` to emit a single warning and silence all subsequent ones. ([#228](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/228))

## 1.2.5 (2020-11-18)

- Allow ommitting `args` in `deployProxy` when it's an empty array.

## 1.2.4 (2020-11-17)

- Fix spurious "Artifacts are from different compiler runs" error when using dependencies through `artifacts.require`. ([#225](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/225))

## 1.2.3 (2020-11-13)

- Fix spurious "Artifacts are from different compiler runs" error on Windows. ([#222](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/222))

## 1.2.2 (2020-11-03)

- Add `jsonrpc: '2.0'` field when using Truffle provider. ([#210](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/210))

## 1.2.1 (2020-10-21)

- Add ability to disable proxy initialization by specifying `initializer: false`. ([#204](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/204))

## 1.2.0 (2020-10-16)

- Add new flag `unsafeAllowLinkedLibraries` to allow deployment of contracts with linked libraries. ([#182](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/182))
- Store address of upgraded proxy in artifact for use with `ContractV2.deployed()`.

## 1.1.1 (2020-10-08)

- Fix OpenZeppelin CLI migration for projects that were initialized with ZeppelinOS. ([#193](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/193))

## 1.1.0 (2020-09-18)

- Add a script to migrate from OpenZeppelin CLI. ([#143](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/143))

## 1.0.2 (2020-09-01)

- Include `src` directory in npm packages. ([#150](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/150))

## 1.0.1 (2020-08-20)

- Store transaction hash in contract instances returned by `deployProxy`. ([#129](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/129), [#133](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/133))
