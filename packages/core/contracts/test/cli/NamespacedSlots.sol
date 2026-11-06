// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades of namespaced storage whose validation depends on the detailed storage layout

library TransientSlot {
    struct TBytes32 {
        bytes32 _placeholder;
    }
}

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
    type U is address;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        U u;
    }
}

// `U` changes from `address` to `uint160`, which keeps the stored value
contract UserDefinedValueTypeV2 {
    type U is uint160;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from address
        U u;
    }
}

contract UserDefinedValueTypeUnannotatedV2 {
    type U is uint160;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        U u;
    }
}

contract UserDefinedValueTypeInStructV1 {
    type U is address;

    struct S {
        U u;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

// `U` changes from `address` to `uint160`, which keeps the stored value
contract UserDefinedValueTypeInStructV2 {
    type U is uint160;

    struct S {
        /// @custom:oz-retyped-from address
        U u;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
    }
}

// The gap is not reduced for `y`
contract GapNotReducedV2 {
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

// The gap is reduced by one slot for two new variables
contract GapReducedTooLittleV2 {
    struct S {
        uint256 x;
        uint256 y;
        uint256 z;
        uint256[48] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
        uint256 last;
    }
}

// The gap is reduced by two slots for one new variable
contract GapReducedTooMuchV2 {
    struct S {
        uint256 x;
        uint256 y;
        uint256[47] __gap;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        S s;
        uint256 last;
    }
}

contract TypeChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 a;
        uint256 b;
    }
}

contract RetypeSizeChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint128
        uint256 a;
        uint256 b;
    }
}

// Passes without a detailed storage layout
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

contract DeletedNamespaceV2 {}

contract NamespaceRetypeV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        bytes32 x;
    }
}

contract NamespaceRetypeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from bytes32
        TransientSlot.TBytes32 x;
    }
}
