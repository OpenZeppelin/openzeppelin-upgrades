// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// This contract is for testing only, it is not safe for use in production.

import {AbstractUpgradeable} from "./AbstractUpgradeable.sol";

contract UsesUpgradeable is AbstractUpgradeable {
    constructor(uint256 _x, uint256 _y, uint256 _z) AbstractUpgradeable(x, y, z) {
    }

    function _authorizeUpgrade(address newImplementation) internal pure override {
        revert("Upgrade disabled");
    }
}