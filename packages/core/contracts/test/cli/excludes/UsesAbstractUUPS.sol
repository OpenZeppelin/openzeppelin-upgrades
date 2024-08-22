// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// This contract is for testing only, it is not safe for use in production.

import {AbstractUUPS} from "./AbstractUUPS.sol";

contract UsesAbstractUUPS is AbstractUUPS {
    constructor(uint256 _x, uint256 _y, uint256 _z) AbstractUUPS(x, y, z) {
    }

    function _authorizeUpgrade(address newImplementation) internal pure override {
        revert("Upgrade disabled");
    }
}