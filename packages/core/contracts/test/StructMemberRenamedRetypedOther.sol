// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TransientSlot {
    struct TBytes32 {
        bytes32 _placeholder;
    }
}

struct OtherFileV1 {
    bytes32 a;
    uint256 b;
}

struct OtherFileV2 {
    /// @custom:oz-retyped-from bytes32
    TransientSlot.TBytes32 a;
    /// @custom:oz-renamed-from b
    uint256 c;
}
