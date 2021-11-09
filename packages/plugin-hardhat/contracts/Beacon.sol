pragma solidity ^0.8.0;

// This contract is for testing only, it is not safe for use in production.

contract Beacon {
    address private _implementation;

    constructor(address implementation_) {
        _setImplementation(implementation_);
    }

    function implementation() public view virtual returns (address) {
        return _implementation;
    }

    function upgradeTo(address newImplementation) public virtual {
        _setImplementation(newImplementation);
    }

    function _setImplementation(address newImplementation) private {
        _implementation = newImplementation;
    }
}
