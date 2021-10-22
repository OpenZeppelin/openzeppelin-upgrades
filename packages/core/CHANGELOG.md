# Changelog

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
