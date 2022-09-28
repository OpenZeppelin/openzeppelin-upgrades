// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract StorageRenamedRetyped {
    /// @custom:oz-renamed-from b
    uint a;

    /// @custom:oz-retyped-from bool
    uint8 b;

    /// @custom:oz-renamed-from b
    /// @custom:oz-retyped-from bool
    uint8 c;

    /// @custom:oz-retyped-from bool
    /// @custom:oz-renamed-from b
    uint8 d;
}
