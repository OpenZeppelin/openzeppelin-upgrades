// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades of namespaced storage whose validation depends on the detailed storage layout

contract FillSlotV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint256 b;
    }
}

contract FillSlotV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint128 c;
        uint256 b;
    }
}

contract FillSlotInStructV1 {
    struct S {
        uint128 a;
        uint256 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

contract FillSlotInStructV2 {
    struct S {
        uint128 a;
        uint128 c;
        uint256 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

contract UseGapV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256[49] __gap;
    }
}

contract UseGapV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256[48] __gap;
    }
}

contract UseGapInStructV1 {
    struct S {
        uint256 x;
        uint256[49] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

contract UseGapInStructV2 {
    struct S {
        uint256 x;
        uint256 y;
        uint256[48] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

// Uses two slots of the gap of UseGapV1
contract UseGapMultipleSlotsV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256 z;
        uint256[47] __gap;
    }
}

contract GapBeforeMemberV1 {
    struct S {
        uint256 x;
        uint256[49] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
        uint256 last;
    }
}

// Uses part of the gap in the struct, so `last` keeps its slot
contract GapBeforeMemberV2 {
    struct S {
        uint256 x;
        uint256 y;
        uint256[48] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
        uint256 last;
    }
}

// Fills the unused space in a slot and appends to the namespace of FillSlotV1
contract FillSlotAndAppendV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint128 c;
        uint256 b;
        uint256 d;
    }
}

contract RetypeInStructV1 {
    struct S {
        bytes32 x;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

contract RetypeInStructV2 {
    struct Wrapped {
        bytes32 value;
    }

    struct S {
        /// @custom:oz-retyped-from bytes32
        Wrapped x;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

contract UserDefinedValueTypeV1 {
    type U is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        U u;
    }
}

// The underlying type of `U` changes to another type of the same size
contract UserDefinedValueTypeV2 {
    type U is int128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        U u;
    }
}

contract UserDefinedValueTypeInStructV1 {
    type U is uint128;

    struct S {
        U u;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

// The underlying type of `U` changes to another type of the same size
contract UserDefinedValueTypeInStructV2 {
    type U is int128;

    struct S {
        U u;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

// The gap of UseGapV1 is not reduced for the new variable
contract WrongGapV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256[49] __gap;
    }
}

// The gap of UseGapV1 is reduced by one slot for two new variables
contract GapReducedTooLittleV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256 z;
        uint256[48] __gap;
    }
}

// The gap of UseGapV1 is reduced by two slots for one new variable
contract GapReducedTooMuchV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256[47] __gap;
    }
}

// The gap in the struct of GapBeforeMemberV1 is not reduced, so `last` moves to another slot
contract GapBeforeMemberWrongV2 {
    struct S {
        uint256 x;
        uint256 y;
        uint256[49] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
        uint256 last;
    }
}

// `a` changes size, compared to FillSlotV1
contract TypeChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 a;
        uint256 b;
    }
}

// `a` changes size with a retype annotation, compared to FillSlotV1
contract RetypeSizeChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint128
        uint256 a;
        uint256 b;
    }
}

// Passes without a detailed storage layout: appends to the namespace of FillSlotV1
contract AppendV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint256 b;
        uint256 d;
    }
}

contract MixedV1 {
    uint256 x;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint256 b;
    }
}

// Also has an unsafe change of a regular state variable
contract RegularStorageErrorV2 {
    address x;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint128 c;
        uint256 b;
    }
}

// Also has an error that is not about storage
contract NonStorageErrorV2 {
    uint256 x;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint128 a;
        uint128 c;
        uint256 b;
    }

    function f(address target) public {
        (bool success, ) = target.delegatecall("");
        success;
    }
}

// The namespace of FillSlotV1 is deleted
contract DeletedNamespaceV2 {}
