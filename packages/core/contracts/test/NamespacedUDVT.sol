// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NamespacedUDVT {
    type MyUserValueType is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
    }
}

contract NamespacedUDVT_V2_Ok {
    type MyUserValueType is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
        uint x;
    }
}

contract NamespacedUDVT_V2_Resize {
    type MyUserValueType is uint8;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
        uint x;
    }
}

contract NamespacedUDVT_MappingKey_V1 {
    type MyUserValueType is bool;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }
}

contract NamespacedUDVT_MappingKey_V2_Ok {
    type MyUserValueType is uint8;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }
}

contract NamespacedUDVT_MappingKey_V2_Bad {
    type MyUserValueType is uint16;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }
}
