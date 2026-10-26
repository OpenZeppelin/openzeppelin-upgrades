// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Upgrades of namespaced storage whose safety depends on the detailed storage layout

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

// Unsafe: the gap is not reduced for the new variable
contract WrongGapV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256[49] __gap;
    }
}

// Unsafe: `a` changes size, compared to FillSlotV1
contract TypeChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 a;
        uint256 b;
    }
}

// Safe without a detailed storage layout: appends to the namespace of FillSlotV1
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
