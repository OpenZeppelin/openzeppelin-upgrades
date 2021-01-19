pragma solidity ^0.5.1;

contract Adder {
    uint n;

    function initialize() public view {
    }

    function add(uint x) public returns (uint) {
        n = n + x;
        return n;
    }

}
