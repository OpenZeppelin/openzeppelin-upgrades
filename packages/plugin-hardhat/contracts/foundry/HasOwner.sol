// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// These contracts are for testing only, they are not safe for use in production.

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

// Basic but pointless contract that has its own owner and can call ProxyAdmin functions
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

contract NoGetter {}

contract StringOwner {
    string public owner;

    constructor(string memory initialOwner) {
        owner = initialOwner;
    }
}

contract StateChanging {
    bool public triggered;

    function owner() public {
        triggered = true;
    }
}
