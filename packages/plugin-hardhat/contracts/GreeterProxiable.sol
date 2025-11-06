// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract GreeterProxiable is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    string public greeting;

    function initialize(address initialOwner, string memory _greeting) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        greeting = _greeting;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
