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

contract MultipleNamespaces {
    /// @custom:storage-location erc7201:one
    struct S1 {
        uint256 a;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint128 a;
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

contract RecursiveStructV2_Outer_Ok {
    struct MyStruct {
        uint128 a;
        uint256 b;
    }

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyStruct s;
        uint256 y;
        uint256 z;
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
        uint256 b;
        uint256 c;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint128 a;
        uint256 b;
        uint256 c;
    }

    uint128 public a;
    uint256 public b;
    uint256 public c;
}

contract MultipleNamespacesAndRegularVariablesV2_Bad {
    /// @custom:storage-location erc7201:one
    struct S1 {
        uint256 c;
        uint128 a;
        uint256 b;
    }

    /// @custom:storage-location erc7201:two
    struct S2 {
        uint256 c;
        uint128 a;
        uint256 b;
    }

    uint256 public c;
    uint128 public a;
    uint256 public b;
}