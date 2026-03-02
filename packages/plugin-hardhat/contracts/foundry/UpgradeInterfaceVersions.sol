// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// These contracts are for testing only.

contract UpgradeInterfaceVersionString {
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";
}

contract UpgradeInterfaceVersionNoGetter {}

contract UpgradeInterfaceVersionEmpty {
    string public constant UPGRADE_INTERFACE_VERSION = "";
}

contract UpgradeInterfaceVersionInteger {
    uint256 public constant UPGRADE_INTERFACE_VERSION = 5;
}

contract UpgradeInterfaceVersionVoid {
    function UPGRADE_INTERFACE_VERSION() external pure {}
}
