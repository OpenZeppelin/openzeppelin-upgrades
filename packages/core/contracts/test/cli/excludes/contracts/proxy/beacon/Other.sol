// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// This contract is for testing only, it is not safe for use in production.

contract Other {
    address immutable foo;

    constructor(address _foo) {
        foo = _foo;
    }
}