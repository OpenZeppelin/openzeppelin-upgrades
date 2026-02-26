// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract BoxV2 is Initializable {
    uint256 private _value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 initialValue) public initializer {
        _value = initialValue;
    }

    function store(uint256 value) public {
        _value = value;
    }

    function retrieve() public view returns (uint256) {
        return _value;
    }

    function increment() public {
        _value += 1;
    }
}
