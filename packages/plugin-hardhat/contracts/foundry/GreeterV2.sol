// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @custom:oz-upgrades-from Greeter
contract GreeterV2 is Initializable, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    string public greeting;

    function initialize(address initialOwner, string memory _greeting) public initializer {
        __Ownable_init(initialOwner);
        greeting = _greeting;
    }

    function resetGreeting() public reinitializer(2) {
        greeting = "resetted";
    }

    function setGreeting(string memory _greeting) public onlyOwner {
        greeting = _greeting;
    }
}
