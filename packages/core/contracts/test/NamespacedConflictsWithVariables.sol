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

contract Parent {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting0 {
        uint256 a;
    } Conflicting0 $Conflicting0;
}

contract ConflictsWithParent is Parent {
    /// @custom:storage-location erc7201:conflicting
    struct Conflicting {
        uint256 a;
    } Conflicting $Conflicting;
}

contract ConflictsInBothParents is DuplicateNamespace, ConflictsWithParent {
    uint256 a;
}

contract InheritsDuplicate is DuplicateNamespace {
}