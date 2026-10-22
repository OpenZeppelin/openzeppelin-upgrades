// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CrossFileV1, CrossFileV2} from "./NamespacedCrossFileStruct.sol";

contract NamespacedCrossFileV1 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        CrossFileV1.Data data;
    }
}

contract NamespacedCrossFileV2 {
    /// @custom:storage-location erc7201:example.main
    struct MainStorage {
        CrossFileV2.Data data;
    }
}
