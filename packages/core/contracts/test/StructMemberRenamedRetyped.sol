// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TransientSlot, OtherFileV1, OtherFileV2} from "./StructMemberRenamedRetypedOther.sol";

contract StructMemberRenamedRetypedV1 {
    struct S {
        bytes32 x;
        uint256 y;
        uint8 f;
        uint256 c;
        uint256 oldD;
    }

    struct Inner {
        uint8 a;
        bytes32 b;
    }

    struct Outer {
        Inner inner;
        uint256 n;
    }

    S s;
    mapping(uint256 => S) m;
    S[] arr;
    Outer outer;
    OtherFileV1 other;
}

contract StructMemberRenamedRetypedV2 {
    struct S {
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
        uint256 c; /// @custom:oz-renamed-from oldD
        uint256 d;
    }

    struct Inner {
        /** @custom:oz-renamed-from a
            @custom:oz-retyped-from uint8 */
        bool g;
        /// @custom:oz-renamed-from b
        /// @dev documented on a second line
        bytes32 bb;
    }

    struct Outer {
        Inner inner;
        uint256 n;
    }

    S s;
    mapping(uint256 => S) m;
    S[] arr;
    Outer outer;
    OtherFileV2 other;
}

contract StructMemberExactMap {
    struct S {
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
    }

    S s;
}

contract StructMemberBadV1 {
    struct S {
        bytes32 x;
        uint256 y;
    }

    S s;
}

contract StructMemberWrongRetypeV2 {
    struct S {
        /// @custom:oz-retyped-from address
        TransientSlot.TBytes32 x;
        uint256 y;
    }

    S s;
}

contract StructMemberWrongMemberV2 {
    struct S {
        /// @custom:oz-renamed-from y
        bytes32 x;
        uint256 z;
    }

    S s;
}

contract StructMemberStaleRenameV2 {
    struct S {
        bytes32 x;
        /// @custom:oz-renamed-from q
        uint256 y;
    }

    S s;
}

contract StructMemberUnannotatedV2 {
    struct S {
        TransientSlot.TBytes32 x;
        uint256 z;
    }

    S s;
}

contract StructMemberUnreadableAnnotated {
    struct S {
        /// @custom:oz-renamed-from a
        uint256 b;
        // 12345678
        uint256 c;
    }

    S s;
}

contract StructMemberUnreadableUnannotated {
    struct S {
        uint256 b;
        // 87654321
        uint256 c;
    }

    S s;
}

contract StateVariableDocBlock {
    /** @custom:oz-renamed-from a
        @custom:oz-retyped-from uint8 */
    bool x;
}

contract StructMemberUnreadableOtherAnnotation {
    struct S {
        /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
        uint256 b;
        // 13572468
        uint256 c;
    }

    S s;
}

contract StructMemberRetypeLayoutChangeV1 {
    struct S {
        uint256 y;
    }

    S s;
}

contract StructMemberRetypeLayoutChangeV2 {
    struct S {
        /// @custom:oz-retyped-from uint256
        uint128 y;
    }

    S s;
}
