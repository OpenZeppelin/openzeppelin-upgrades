// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NamespacedUDVT_NoLayout {
    type MyUserValueType is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
    }
}

contract NamespacedUDVT_NoLayout_V2_Ok {
    type MyUserValueType is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
        uint x;
    }
}

contract NamespacedUDVT_Layout {
    type MyUserValueType is uint128;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
    }

    // Use a variable here so the storage layout is created without having to do a modified namespaced compilation for the tests
    MainStorage $MainStorage;
}

contract NamespacedUDVT_Layout_V2_Bad {
    type MyUserValueType is uint8;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        MyUserValueType my_user_value;
        uint x;
    }

    // Use a variable here so the storage layout is created without having to do a modified namespaced compilation for the tests
    MainStorage $MainStorage;
}

contract NamespacedUVDT_MappingKey_V1 {
    type MyUserValueType is bool;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }

    // Use a variable here so the storage layout is created without having to do a modified namespaced compilation for the tests
    MainStorage $MainStorage;
}

contract NamespacedUVDT_MappingKey_V2_Ok {
    type MyUserValueType is uint8;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }

    // Use a variable here so the storage layout is created without having to do a modified namespaced compilation for the tests
    MainStorage $MainStorage;
}

contract NamespacedUVDT_MappingKey_V2_Bad {
    type MyUserValueType is uint16;

    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        mapping (MyUserValueType => uint) m1;
        mapping (MyUserValueType => uint) m2;
        mapping (uint8 => uint) m3;
    }

    // Use a variable here so the storage layout is created without having to do a modified namespaced compilation for the tests
    MainStorage $MainStorage;
}
