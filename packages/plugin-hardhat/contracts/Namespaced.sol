// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Example {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        uint256 x;
        uint256 y;
    }

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab5da;

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

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab5da;

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

    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab5da;

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

// TODO:

// mixed usage of regular variables and namespaces

// multiple namespaces