// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Abstract1} from "./Abstract1.sol";
import {Abstract2} from "./Abstract2.sol";

abstract contract AbstractUUPS is UUPSUpgradeable, Abstract1, Abstract2 {
    uint256 public immutable z;

    constructor(uint256 _x, uint256 _y, uint256 _z) Abstract1(_x) Abstract2(_y) {
        z = _z;
    }

    function initialize() initializer public {
        __UUPSUpgradeable_init();
    }
}