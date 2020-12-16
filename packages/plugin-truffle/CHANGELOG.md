# Changelog

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
