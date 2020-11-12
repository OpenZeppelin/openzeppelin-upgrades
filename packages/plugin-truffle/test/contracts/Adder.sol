pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract Adder {
    uint public n;

    function initialize(uint _n) public {
        n = _n;
    }

    function add(uint x) public returns (uint) {
        n = n + x;
        return n;
    }

}
