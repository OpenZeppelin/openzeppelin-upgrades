// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract AbstractNotUpgradeable {
  uint256 public immutable x;

  constructor(uint256 _x) {
    x = _x;
  }
}