// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AbstractNotUpgradeable} from "./AbstractNotUpgradeable.sol";
import {AbstractNotUpgradeable2} from "./AbstractNotUpgradeable2.sol";

abstract contract AbstractUpgradeable is UUPSUpgradeable, AbstractNotUpgradeable, AbstractNotUpgradeable2 {
    uint256 public immutable z;

    constructor(uint256 _x, uint256 _y, uint256 _z) AbstractNotUpgradeable(_x) AbstractNotUpgradeable2(_y) {
        z = _z;
    }
}