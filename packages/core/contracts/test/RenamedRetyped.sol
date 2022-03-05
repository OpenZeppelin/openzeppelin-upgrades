// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract RenameV1 {
    uint x;
}

contract RenameV2 {
    /// @custom:oz-renamed-from x
    uint y;
}

contract RetypeV1 {
    bool x;
}

contract RetypeV2 {
    /// @dev a retyped variable
    /// @custom:oz-retyped-from bool
    uint8 x;
}

contract WronglyReportedRetypeV3 {
    /// @custom:oz-retyped-from address
    uint8 x;
}

contract MissmatchingTypeRetypeV4 {
    /// @custom:oz-retyped-from bool
    bytes32 x;
}

contract ConfusingRetypeV1 {
    address y;
    bool x;
}

contract ConfusingRetypeV2 {
    address y;
    /// @custom:oz-retyped-from address
    uint8 x;
}

contract NonHardcodedRetypeV1 {
    address a;
}

contract NonHardcodedRetypeV2 {
    /// @custom:oz-retyped-from address
    bytes20 a;
}
