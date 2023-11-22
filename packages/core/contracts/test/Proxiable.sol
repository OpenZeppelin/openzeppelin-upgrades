// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// These contracts are for testing only, they are not safe for use in production.

abstract contract BrokenProxiable {
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    // NOT SAFE FOR PRODUCTION USE.
    // This does NOT actually perform any upgrade, but is only for tests to check that this function exists.
    function upgradeToAndCall(address newImplementation, bytes calldata data) external {
        _authorizeUpgrade(newImplementation);
    }

    function _authorizeUpgrade(address newImplementation) internal {
        _beforeUpgrade(newImplementation);
    }

    function _beforeUpgrade(address newImplementation) internal virtual;
}

contract ChildOfProxiable is BrokenProxiable {
    function _beforeUpgrade(address newImplementation) internal virtual override {}
}
