// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Example {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;

    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := MAIN_STORAGE_LOCATION
        }
    }

    function _getXTimesY() internal view returns (uint256) {
        MainStorage storage $ = _getMainStorage();
        return $.x * $.y;
    }
}

contract ExampleV2_Ok {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
        uint256 z;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;

    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := MAIN_STORAGE_LOCATION
        }
    }

    function _getXTimesYPlusZ() internal view returns (uint256) {
        MainStorage storage $ = _getMainStorage();
        return $.x * $.y + $.z;
    }
}

contract ExampleV2_Bad {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 y;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;

    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := MAIN_STORAGE_LOCATION
        }
    }

    function _getYSquared() internal view returns (uint256) {
        MainStorage storage $ = _getMainStorage();
        return $.y * $.y;
    }
}

contract RecursiveStruct {
    struct MyStruct {
        uint128 a;
        uint256 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyStruct s;
        uint256 y;
    }
}

contract RecursiveStructV2_Ok {
    struct MyStruct {
        uint128 a;
        uint128 a2;
        uint256 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyStruct s;
        uint256 y;
    }
}

contract RecursiveStructV2_Bad {
    struct MyStruct {
        uint128 a;
        uint256 b;
        uint256 c;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyStruct s;
        uint256 y;
    }
}

contract TripleStruct {
    struct Inner {
        uint128 a;
        uint256 b;
    }

    struct Outer {
        Inner i;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        Outer s;
        uint256 y;
    }
}

contract TripleStructV2_Ok {
    struct Inner {
        uint128 a;
        uint128 a2;
        uint256 b;
    }

    struct Outer {
        Inner i;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        Outer s;
        uint256 y;
    }
}

contract TripleStructV2_Bad {
    struct Inner {
        uint128 a;
        uint256 b;
        uint256 c;
    }

    struct Outer {
        Inner i;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        Outer s;
        uint256 y;
    }
}

contract MultipleNamespacesAndRegularVariables {
    /// @custom:storage-location erc7201:one
    struct S1 {
        uint128 a;
        uint256 b;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint128 a;
        uint256 b;
    }

    uint128 public a;
    uint256 public b;
}

contract MultipleNamespacesAndRegularVariablesV2_Ok {
    /// @custom:storage-location erc7201:one
    struct S1 {
        uint128 a;
        uint128 a2;
        uint256 b;
        uint256 c;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint128 a;
        uint128 a2;
        uint256 b;
        uint256 c;
    }

    uint128 public a;
    uint128 public a2;
    uint256 public b;
    uint256 public c;
}

contract MultipleNamespacesAndRegularVariablesV2_Bad {
    /// @custom:storage-location erc7201:one
    struct S1 {
        uint128 a;
        uint256 a2;
        uint256 b;
        uint256 c;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint128 a;
        uint256 a2;
        uint256 b;
        uint256 c;
    }

    uint128 public a;
    uint256 public a2;
    uint256 public b;
    uint256 public c;
}

contract NoNamespace {
    // not annotated as a namespace
    struct MainStorage {
        uint256 x;
        uint256 y;
    }
}

contract InheritsNamespace is Example {
}

contract InheritsNamespaceV2_Ok is ExampleV2_Ok {
}

contract InheritsNamespaceV2_Bad is ExampleV2_Bad {
}

contract InheritsNamespaceV2_BadAndHasLayout is ExampleV2_Bad {
    uint256 public a;
}
