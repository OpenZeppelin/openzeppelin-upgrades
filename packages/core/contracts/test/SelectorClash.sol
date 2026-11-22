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

contract SelectorClashGetterV1 {
    mapping(bytes16 => uint256) public collate_propagate_storage;
}

contract SelectorClashGetters {
    uint256 public number;
    uint256 public constant LIMIT = 1;
    address public immutable owner = address(1);
    string public label;
    uint256[] public list;
    uint256[2][3] public grid;
    mapping(address => mapping(bytes32 => uint256)) public nested;
    mapping(Kind => IToken) public tokenOf;
    mapping(address => uint256[]) public balancesOf;
    Pair public pair;
    Pair[] public pairs;
}

interface ISelectorClashValue {
    function value() external view returns (uint256);
}

contract SelectorClashOverride is ISelectorClashValue {
    uint256 public override value;
}

contract SelectorClashGetterParent {
    mapping(bytes16 => uint256) public collate_propagate_storage;
}

contract SelectorClashGetterChild is SelectorClashGetterParent {}
