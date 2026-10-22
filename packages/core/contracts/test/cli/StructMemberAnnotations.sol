// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TransientSlot {
    struct TBytes32 {
        bytes32 _placeholder;
    }
}

contract StructMemberAnnotationsV1 {
    struct S {
        bytes32 x;
        uint256 y;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint8 f;
    }

    S s;
}

contract StructMemberAnnotationsV2 {
    struct S {
        /// @custom:oz-retyped-from bytes32
        TransientSlot.TBytes32 x;
        /// @custom:oz-renamed-from y
        uint256 z;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint8
        bool f;
    }

    S s;
}

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
