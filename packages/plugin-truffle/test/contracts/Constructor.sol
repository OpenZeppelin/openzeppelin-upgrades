// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

contract WithConstructor {
    constructor(uint256 args) public {
        args;
    }
}