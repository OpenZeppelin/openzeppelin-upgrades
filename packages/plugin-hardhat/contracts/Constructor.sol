// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WithConstructor {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public immutable value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint256 args) {
        value = args;
    }
}