// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DuplicateNamespace {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting1 {
        uint256 b;
    } Conflicting1 $Conflicting1;

    /// @custom:storage-location erc7201:conflicting
    struct Conflicting2 {
        uint256 c;
    } Conflicting2 $Conflicting2;
}

contract ConflictsWithParent is DuplicateNamespace {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting {
        uint256 a;
    } Conflicting $Conflicting;
}

contract ConflictsInBothParents is DuplicateNamespace, ConflictsWithParent {
}