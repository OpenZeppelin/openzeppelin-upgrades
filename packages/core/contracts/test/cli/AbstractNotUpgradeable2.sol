// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract AbstractNotUpgradeable2 {
  uint256 public immutable y;

  constructor(uint256 _y) {
    y = _y;
  }
}