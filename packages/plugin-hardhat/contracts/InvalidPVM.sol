pragma solidity ^0.5.1;

contract InvalidPVM {
    function initialize() public view {}

    function oops() public {
    }
}

import './utils/Proxiable.sol';
contract InvalidPVMProxiable is InvalidPVM, Proxiable {
    string greeting;

    constructor(uint256 breakingArgument) public {}
}
