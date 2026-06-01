// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

// Exercises the `erc7201(string)` comptime builtin from Solidity 0.8.35+ as a `layout at` base slot.
//
// keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff))
//   == 0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500

contract Erc7201Builtin layout at erc7201("example.main") {
    uint256 a;
}

contract Erc7201Builtin_Append_Ok layout at erc7201("example.main") {
    uint256 a;
    uint256 b;
}

contract Erc7201Builtin_Changed_Id_Bad layout at erc7201("example.other") {
    uint256 a;
}

// Numeric literal equal to erc7201("example.main"); must compare equal to the builtin form above.
contract Erc7201Builtin_Literal_Equivalent layout at 0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500 {
    uint256 a;
}

// Base slot equals the namespace's storage location: clash.
contract Erc7201Builtin_Clash layout at erc7201("example.main") {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 a;
}

// Base slot is a different erc7201 hash than the namespace: no clash, and no overlap warning.
contract Erc7201Builtin_NoClash_NoWarning layout at erc7201("example.other") {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 a;
}

// Literal base slot together with a namespace: the overlap warning still applies (not suppressed).
contract Erc7201Builtin_LiteralBase_Warns layout at 0x1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 a;
}
