pragma solidity ^0.5.1;

contract InvalidPVM {
    function initialize() public view {}

    function oops() public {
        // selfdestruct(msg.sender);
    }
}

import './utils/Proxiable.sol';
contract InvalidPVMProxiable is InvalidPVM, Proxiable {}
