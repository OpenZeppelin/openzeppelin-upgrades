// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DuplicateNamespace {
    function foo() public pure returns (uint256) {
        return 0;
    }

    /// @custom:storage-location erc7201:conflicting
    struct Conflicting1 {
        uint256 b;
    }

    /// @custom:storage-location erc7201:conflicting
    struct Conflicting2 {
        uint256 c;
    }

    function foo2() public pure returns (uint256) {
        return 0;
    }
}

contract ConflictsWithParent is DuplicateNamespace {
    function foo3() public pure returns (uint256) {
        return 0;
    }

    /// @custom:storage-location erc7201:conflicting
    struct Conflicting {
        uint256 a;
    }

    function foo4() public pure returns (uint256) {
        return 0;
    }
}

contract ConflictsInBothParents is DuplicateNamespace, ConflictsWithParent {
}