// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DuplicateNamespace {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting1 {
        uint256 b;
    }

    /// @custom:storage-location erc7201:conflicting
    struct Conflicting2 {
        uint256 c;
    }
}

contract ConflictsWithParent is DuplicateNamespace {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting {
        uint256 a;
    }
}

contract ConflictsInBothParents is DuplicateNamespace, ConflictsWithParent {
}