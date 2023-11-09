// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// These contracts are for testing only, they are not safe for use in production.

abstract contract UUPSUpgradeable {
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    function upgradeToAndCall(address newImplementation, bytes calldata data) external {
        _authorizeUpgrade(newImplementation);
        if (data.length > 0) {
            (bool success, ) = address(this).call(data);
            require(success, "upgrade call reverted");
        }
    }

    function _authorizeUpgrade(address newImplementation) internal virtual;
}

abstract contract Proxiable is UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) internal override {
        _beforeUpgrade(newImplementation);
    }

    function _beforeUpgrade(address newImplementation) internal virtual;
}

contract ChildOfProxiable is Proxiable {
    function _beforeUpgrade(address newImplementation) internal virtual override {}
}
