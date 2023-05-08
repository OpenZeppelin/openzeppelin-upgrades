// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Initializable as Initializable1} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Initializable as Initializable2} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NonUpgradeable {
}

contract IsInitializable is Initializable1 {
}

contract IsInitializableUpgradeable is Initializable2 {
}

// Insecure contract
contract IsUUPS is UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation)
        internal
        override
    {}
}
