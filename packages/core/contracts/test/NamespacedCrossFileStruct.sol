// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CrossFileV1 {
    struct Data {
        bytes32 a;
        uint256 b;
    }
}

library CrossFileV2 {
    struct Data {
        /// @custom:oz-retyped-from bytes32
        uint256 a;
        /// @custom:oz-renamed-from b
        uint256 c;
    }
}
