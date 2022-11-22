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

contract LayoutChangeV1 {
    bool a;
    bool b;
}

contract LayoutChangeV2 {
    /// @custom:oz-retyped-from bool
    uint16 a;

    /// @custom:oz-retyped-from bool
    uint8 b;
}

interface Type1 {}
interface Type2 {}

contract RetypeInterfaceAddressV1 {
    Type1 private a;
    address private b;
    Type1 private c;
}

contract RetypeInterfaceAddressV2 {
    address private a;
    Type2 private b;
    Type2 private c;
}

contract RetypeInterfaceAddressMappingV1 {
    mapping(uint8 => Type1) a;
    mapping(uint8 => address) b;
    mapping(uint8 => Type1) c;
}

contract RetypeInterfaceAddressMappingV2 {
    /// @custom:oz-renamed-from a
    mapping(uint8 => address) private _a;

    /// @custom:oz-renamed-from b
    mapping(uint8 => Type2) private _b;

    /// @custom:oz-renamed-from c
    mapping(uint8 => Type2) private _c;
}