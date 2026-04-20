// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract StorageInsertBetweenSlotsV1 {
    uint256 a;
    uint128 b;
    uint256 c;
}

contract StorageInsertBetweenSlotsV2_Ok {
    uint256 a;
    uint128 b;
    uint128 b1;
    uint256 c;
}

contract StorageInsertBetweenSlotsV2_Bad {
    uint256 a;
    uint128 b;
    uint256 b1;
    uint256 c;
}