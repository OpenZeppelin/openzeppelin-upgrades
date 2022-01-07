pragma solidity ^0.5.1;

// This contract is for testing only, it is not safe for use in production.

contract Beacon {
    address private _implementation;

    constructor(address implementation_) public {
        _setImplementation(implementation_);
    }

    function implementation() public view returns (address) {
        return _implementation;
    }

    function upgradeTo(address newImplementation) public {
        _setImplementation(newImplementation);
    }

    function _setImplementation(address newImplementation) private {
        _implementation = newImplementation;
    }
}
