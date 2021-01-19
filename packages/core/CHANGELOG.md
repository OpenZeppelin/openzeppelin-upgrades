# Changelog

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
