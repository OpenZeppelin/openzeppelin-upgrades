# Changelog

## Unreleased

- Fix parsing of renamed/retyped annotations. ([#666](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/666))
- Fix treatment of type ids for user defined value types. ([#671](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/671))

## 1.20.0 (2022-09-27)

- Support user defined value types. ([#658](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/658))
- Include solc version in storage layouts in manifest files. ([#662](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/662))

## 1.19.1 (2022-09-10)

- Fix missing module. ([#652](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/652))

## 1.19.0 (2022-09-10)

- Add support for avalanche and avalanche-fuji to manifest file names. ([#622](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/622))
- Support storage layout gaps. ([#276](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/276))

## 1.18.0 (2022-08-08)

- Provide granular functions to allow more customizable deployments. ([#580](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/580))

## 1.17.0 (2022-07-26)

- Remove BN.js in favor of native BigInt. ([#602](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/602))
- Add support for additional network names in network manifest. ([#547](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/547))

## 1.16.1 (2022-06-16)

- Fix VM execution error in `proposeUpgrade` with Gnosis Chain. ([#597](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/597))

## 1.16.0 (2022-06-16)

- Return ethers transaction response with `proposeUpgrade`. ([#554](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/554))

## 1.15.0 (2022-05-31)

- Support `unsafeSkipStorageCheck` option in `ValidationOptions`. ([#566](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/566))
- Support verifying a proxy on Etherscan using Hardhat. ([#579](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/579))

## 1.14.2 (2022-04-18)

- Fix handling of rename annotations when unchanged from one version to the next. ([#558](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/558))

## 1.14.1 (2022-03-16)

- Fix interference with other Hardhat plugins that use the AST. ([#541](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/541))

## 1.14.0 (2022-03-14)

- Add support for function types in storage layout. ([#529](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/529))
- Add ability to change a variable type or name through `/// @custom:oz-renamed-from abc` and `/// @custom:oz-retyped-from bool`. ([#531](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/531))

## 1.13.1 (2022-03-08)

- Fix bug that caused missing members when using solc storageLayout. ([#534](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/534))

## 1.13.0 (2022-03-01)

- Remove `admin.deployTransaction` field written to network manifest. ([#510](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/510))
- Add `forceImport` function to import an existing proxy or beacon. ([#517](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/517))
- Extract and store more detailed information about storage layout. ([#519](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/519))

## 1.12.0 (2022-01-31)

- Add options `timeout` and `pollingInterval`. ([#55](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/55))

## 1.11.1 (2022-01-20)

- Fix error when proposing upgrade to Infura. ([#503](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/503))

## 1.11.0 (2022-01-12)

- Add support for beacon proxies. ([#342](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/342))

## 1.10.0 (2021-10-22)

- Infer whether a proxy should be UUPS or Transparent. ([#441](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/441))
- Add a standalone interface to the core. ([#442](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/442))
- Add implementation constructor arguments to initialize immutable variables. ([#433](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/433))

## 1.9.2 (2021-09-17)

- Fix a bug where libraries used transitively were not considered for safety checks.

## 1.9.1 (2021-09-15)

- Silence all warnings when using `silenceWarnings`.

## 1.9.0 (2021-08-25)

- Add `getBeaconAddress`. ([#413](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/413))

## 1.8.1 (2021-08-06)

- Add support for function types.

## 1.8.0 (2021-06-29)

- Add option `unsafeAllowRenames` to configure storage layout check to allow variable renaming.

## 1.7.6 (2021-05-25)

- Fix recognition of value types in storage layouts.

## 1.7.5 (2021-05-22)

- Fix exception when upgrading mapping key to enum.

## 1.7.4 (2021-05-22)

- Fix handling of functions with struct or mapping storage pointer arguments.

## 1.7.3 (2021-05-13)

- Simplify clean up of manifest data before storing to disk.

## 1.7.2 (2021-05-13)

- Fix bug when the project uses external libraries.

## 1.7.1 (2021-05-03)

- Use `web3_clientVersion` to better detect development networks.

## 1.7.0 (2021-04-29)

- Add support for UUPS proxies. ([#315](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/315))
- Fix parsing of NatSpec `@custom:oz-upgrades-unsafe-allow` when included in a `/**`-style comment.

## 1.6.0 (2021-04-14)
- Add `unsafeAllow` as a new field in `ValidationOptions`, which can be used as a manual override to silence any type of validation error. For example, `opts = { unsafeAllow: ['external-library-linking', 'delegatecall'] }` will silence the corresponding checks. ([#320](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/320))
- Custom NatSpec comments can disable error checks directly from the Solidity code. See `core/contracts/test/ValidationNatspec.sol` for example usage of these NatSpec comments. Note: this requires Solidity >=0.8.2. ([#320](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/320))
- Fix a bug with library placeholders when hashing contract source code. ([#320](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/320))

## 1.5.1 (2021-02-24)

- Add support for enum keys in mappings. ([#301](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/301))

## 1.5.0 (2021-01-27)

- Add support for structs and enums. ([#261](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/261))
- Enable optimizations when compiling proxies.

## 1.4.4 (2021-01-14)

- Fix `InvalidDeployment` error on some networks. ([#282](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/282))

## 1.4.3 (2020-12-21)

- Fix a type error caused by duplicate contract names in Truffle.

## 1.4.2 (2020-12-16)

- Fix an error in the `unsafeAllowCustomTypes` flag that would cause other storage layout incompatibilities to be ignored. ([#259](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/259))

Users of this flag are advised to update to this version.

## 1.4.1 (2020-11-30)

- Fix a problem in deployment logic when used with Hyperledger Besu. ([#244](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/244))

## 1.4.0 (2020-11-24)

- Add `silenceWarnings` to emit a single warning and silence all subsequent ones. ([#228](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/228))

## 1.3.1 (2020-11-13)

- Add missing artifact files in the package.

## 1.3.0 (2020-11-13)

- Support Hardhat. ([#214](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/214))

## 1.2.0 (2020-10-16)

- Support new flag `unsafeAllowLinkedLibraries` to allow deployment of contracts with linked libraries. ([#182](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/182))

## 1.1.1 (2020-10-08)

- Fix OpenZeppelin CLI migration for projects that were initialized with ZeppelinOS. ([#193](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/193))

## 1.1.0 (2020-09-18)

- Add ability to migrate from OpenZeppelin CLI. ([#143](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/143))

## 1.0.2 (2020-09-16)

- Fix false positive variable initialization check in Solidity 0.7.1. ([#171](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/171))

## 1.0.1 (2020-09-01)

- Include `src` directory in npm packages. ([#150](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/150))
