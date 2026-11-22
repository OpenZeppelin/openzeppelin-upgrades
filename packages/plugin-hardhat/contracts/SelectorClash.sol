// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract SelectorClashV1 {
    function collate_propagate_storage(bytes16) external {}
}

contract SelectorClashV2 {
    function burn(uint256) external {}
}
