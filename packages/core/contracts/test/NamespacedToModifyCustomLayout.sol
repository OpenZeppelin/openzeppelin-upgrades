// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

abstract contract Base {
}

contract ExampleCustomLayout layout at 0x123 is Base {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 z;
    }
}

contract ExampleCustomLayout_DifferentSpecifierOrder is Base layout at 0x123 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 z;
    }
}