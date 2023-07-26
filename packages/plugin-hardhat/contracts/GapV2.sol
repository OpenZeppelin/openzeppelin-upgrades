// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract GapV2 {
    string greeting;
    uint256 new1;
    uint256 new2;
    uint256[47] private __gap;
}

contract GapV2_Bad {
    string greeting;
    uint256 new1;
    uint256 new2;
    uint256[48] private __gap;
}
