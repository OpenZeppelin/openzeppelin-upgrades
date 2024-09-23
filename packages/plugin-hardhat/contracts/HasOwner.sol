// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * This contract is for testing only.
 * Basic but pointless contract that has its own owner and can call ProxyAdmin functions.
 */
contract HasOwner is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    function upgradeAndCall(
        ProxyAdmin admin,
        ITransparentUpgradeableProxy proxy,
        address implementation,
        bytes memory data
    ) public payable virtual onlyOwner {
        admin.upgradeAndCall{value: msg.value}(proxy, implementation, data);
    }
}