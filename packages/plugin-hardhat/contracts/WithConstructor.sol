// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// These contracts are for testing only, they are not safe for use in production.

contract WithConstructor {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public immutable a;

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public immutable value;

    uint256 public b;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint256 _a) {
        a = _a;
        value = _a; // Keep both for backward compatibility
    }

    function initialize(uint256 _b) public {
        b = _b;
    }
}

contract WithConstructorArray {
    uint256[] public x;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint256[] memory args) {
        x = args;
    }
}

contract NoInitializer {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public immutable a;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint256 _a) {
        a = _a;
    }
}
