# Changelog

## Unreleased

- Remove check for beacon in `proposeUpgrade`. ([#745](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/745))

## 1.8.1 (2022-09-27)

- Silence warning about missing Defender configuration unless it is required. ([#663](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/663))

## 1.8.0 (2022-08-29)

- Add functions to verify that a compiled artifact matches code on chain. ([#642](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/642))

## 1.7.1 (2022-08-08)

- Fix type for options in `proposeUpgrade`. ([#609](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/609))

## 1.7.0 (2022-06-16)

- Return ethers transaction response with `proposeUpgrade`. ([#554](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/554))

## 1.6.2 (2022-06-03)

- Fix version dependency. ([#590](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/590))

## 1.6.1 (2022-05-31)

- Require multisig address for `proposeUpgrade` with UUPS proxy. ([#568](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/568))

## 1.6.0 (2022-01-12)

- Add support for beacon proxies. ([#342](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/342))

## 1.5.1 (2021-11-04)

- Pass additional options on to `prepareUpgrade`.

## 1.5.0 (2021-04-29)

- Add support for UUPS proxies. ([#315](https://github.com/OpenZeppelin/openzeppelin-upgrades/pull/315))

## 1.4.3

- Initial version with `proposeUpgrade` function.
