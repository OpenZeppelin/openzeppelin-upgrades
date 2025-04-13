// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

abstract contract Base {
    uint256 public x;
}

contract CustomLayout layout at 0x1 is Base {
    uint256 public y;
}

contract CustomLayout_Same_Root_Ok layout at 0x1 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Same_Root_Decimal_Ok layout at 1 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Same_Root_ScientificNotation_Ok layout at 1000.0e-3 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_Root_Bad layout at 0x2 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_Root_Decimal_Bad layout at 2 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_Root_ScientificNotation_Bad layout at 2.0e10 is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_To_Default_Bad is Base {
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_Root_Ok layout at 0x0 {
    uint256 public insertedBefore;
    uint256 public x;
    uint256 public y;
    uint256 public z;
}

contract CustomLayout_Changed_To_Default_Ok {
    uint256 public insertedBefore;
    uint256 public x;
    uint256 public y;
    uint256 public z;
}

contract Namespaced_Default_Layout {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;
}

contract CustomLayout_Unsupported_Node_Type layout at 0x2 ** 0x3 {
    uint256 public x;
}

contract Namespaced_Custom_Layout_Unaffected layout at 0x1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;
}

contract Namespaced_Custom_Layout_Clash layout at 0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 clashesWithNamespace;

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;
}

contract Namespaced_Custom_Layout_Clash_Decimal layout at 10958655983261152271848436692291137275443024275653522991983264966744321209600 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 clashesWithNamespace;

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;
}

contract Namespaced_Custom_Layout_Clash_Extra_Colon layout at 0xc7aaba8d22be97cadd7427e7a6841eaffa38e68fd57b8f5417d9acc1a1566e00 {
    /// @custom:storage-location erc7201:example:main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 clashesWithNamespace;

    // keccak256(abi.encode(uint256(keccak256("example:main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0xc7aaba8d22be97cadd7427e7a6841eaffa38e68fd57b8f5417d9acc1a1566e00;
}

/// No formula id for the namespace (annotation does not comply with ERC-7201), so it is not checked for clash with custom layout
contract CustomLayout_No_Namespace_Formula layout at 0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500 {
    /// @custom:storage-location example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 a;
}

/// No formula id for the namespace (annotation does not comply with ERC-7201), so it is not checked for clash with custom layout
contract CustomLayout_Unknown_Namespace_Formula layout at 0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500 {
    /// @custom:storage-location erc0000:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    uint256 a;
}

abstract contract NamespaceA {
    /// @custom:storage-location erc7201:example.a
    struct AStorage {
        uint256 x;
    }
}

abstract contract NamespaceB {
    /// @custom:storage-location erc7201:example.b
    struct BStorage {
        uint256 x;
    }
}

contract CustomLayout_Multiple_Namespaces layout at 0x1 is NamespaceA, NamespaceB {
}

contract Gap {
    uint256[50] __gap;
    uint256 public x;
}

contract Gap_Changed_Root_Ok layout at 25 {
    uint256[25] __gap;
    uint256 public x;
}
