// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Defined at file level, so that the type label is `Amount` in both this file and UnderlyingTypeV2.sol
type Amount is uint128;

contract UnderlyingTypeV1 {
    Amount a;
    mapping(address => Amount) m;
    Amount[] list;
}
