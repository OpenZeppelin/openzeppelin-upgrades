// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TransientSlot {
    struct TBytes32 {
        bytes32 _placeholder;
    }
}

contract NamespacedRenamedRetypedV1 {
    struct Inner {
        uint8 a;
        bytes32 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        bytes32 x;
        uint256 y;
        uint8 f;
        Inner inner;
        uint256 c;
        uint256 oldD;
    }
}

contract NamespacedRenamedRetypedV2 {
    struct Inner {
        /** @custom:oz-renamed-from a
            @custom:oz-retyped-from uint8 */
        bool g;
        /// @custom:oz-renamed-from b
        /// @dev documented on a second line
        bytes32 bb;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from bytes32
        TransientSlot.TBytes32 x; // trailing comment on the member line
        // plain comment before an annotated member
        /**
         * @dev documented in a block
         * @custom:oz-renamed-from y
         */
        uint256 z;
        /* block comment */ /// @custom:oz-retyped-from uint8
        bool f;
        Inner inner;
        uint256 c; /// @custom:oz-renamed-from oldD
        uint256 d;
    }
}

contract NamespacedRenamedRetypedInheritedV1 is NamespacedRenamedRetypedV1 {}

contract NamespacedRenamedRetypedInheritedV2 is NamespacedRenamedRetypedV2 {}

contract NamespacedExactMap {
    struct Inner {
        /// @custom:oz-renamed-from old_p
        uint256 p;
        // Multi-byte character: 🚀
        /// @custom:oz-renamed-from old_q
        uint128 q; /// @custom:oz-renamed-from old_r
        uint128 r;
    }

    /// @custom:storage-location erc7201:example.exact
    struct ExactStorage {
        /// @custom:oz-renamed-from old_a
        uint256 a;
        // Multi-byte character: 🚀
        /// @custom:oz-renamed-from old_b
        uint128 b; /// @custom:oz-renamed-from old_c
        uint128 c;
        /** @custom:oz-renamed-from old_d */
        mapping(address => uint256) d;
        /**
         * @custom:oz-renamed-from old_e
         */
        uint256[] e;
        /// @custom:oz-renamed-from old_inner
        Inner inner;
    }
}

contract NamespacedBadV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        bytes32 x;
        uint256 y;
    }
}

contract NamespacedWrongRetypeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from address
        TransientSlot.TBytes32 x;
        uint256 y;
    }
}

contract NamespacedWrongMemberV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-renamed-from y
        bytes32 x;
        uint256 z;
    }
}

contract NamespacedStaleRenameV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        bytes32 x;
        /// @custom:oz-renamed-from q
        uint256 y;
    }
}

contract NamespacedUnannotatedV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        TransientSlot.TBytes32 x;
        uint256 z;
    }
}

contract NamespacedTwoV1 {
    /// @custom:storage-location erc7201:example.first
    struct FirstStorage {
        bytes32 x;
        uint256 oldY;
    }

    /// @custom:storage-location erc7201:example.second
    struct SecondStorage {
        uint8 f;
        uint256 oldG;
    }
}

contract NamespacedTwoV2 {
    /// @custom:storage-location erc7201:example.first
    struct FirstStorage {
        /// @custom:oz-retyped-from bytes32
        TransientSlot.TBytes32 x;
        /// @custom:oz-renamed-from oldY
        uint256 y;
    }

    /// @custom:storage-location erc7201:example.second
    struct SecondStorage {
        /// @custom:oz-retyped-from uint8
        bool f;
        /// @custom:oz-renamed-from oldG
        uint256 g;
    }
}

contract NamespacedRetypeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from bytes32
        TransientSlot.TBytes32 x;
        uint256 y;
    }
}

// The annotation of a retype made in an earlier upgrade is kept in both versions
contract NamespacedKeptRetypeV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint8
        uint256 x;
    }
}

contract NamespacedKeptRetypeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint8
        uint256 x;
    }
}

contract NamespacedRetypeLayoutChangeV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 y;
    }
}

contract NamespacedRetypeLayoutChangeV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        /// @custom:oz-retyped-from uint256
        uint128 y;
    }
}
