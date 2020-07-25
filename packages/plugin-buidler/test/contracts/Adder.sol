pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

contract Adder {
    uint n;

    function initialize() public {
        console.log("Deploying Adder");
    }

    function add(uint x) public returns (uint) {
        n = n + x;
        return n;
    }

}
