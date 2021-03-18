// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Adder {
    uint n;

    function initialize() public view {
    }

    function add(uint x) public returns (uint) {
        n = n + x;
        return n;
    }

}

import "./utils/Proxiable.sol";
contract AdderProxiable is Adder, Proxiable {}
