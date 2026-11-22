// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IToken {}

enum Kind {
    A,
    B
}

struct Pair {
    uint256 a;
    uint256 b;
}

contract SelectorClashParent {
    function burn(uint256) external {}
}

contract SelectorClashV1 {
    function collate_propagate_storage(bytes16) external {}

    function unchanged() external {}
}

contract SelectorClashV2Bad {
    function burn(uint256) external {}

    function unchanged() external {}
}

contract SelectorClashV2Inherited is SelectorClashParent {
    function unchanged() external {}
}

contract SelectorClashV2Ok {
    function renamed(bytes16) external {}

    function unchanged() external {}
}

contract SelectorClashCanonical {
    function transfer(address payable, uint256) external {}

    function tokens(IToken[] calldata) external {}

    function kinds(Kind[] calldata) external {}

    function pair(Pair calldata) external {}

    function fixedArray(uint256[3] calldata) external {}

    fallback(bytes calldata) external returns (bytes memory) {}
}
