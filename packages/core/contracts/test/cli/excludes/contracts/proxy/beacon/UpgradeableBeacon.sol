// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// This contract is for testing only, it is not safe for use in production.

import {Other} from "./Other.sol";

contract UpgradeableBeacon is Other {
    constructor(address foo) Other(foo) {
    }

    function upgradeTo(address newImplementation) public pure {
        revert("Upgrade disabled");
    }
}