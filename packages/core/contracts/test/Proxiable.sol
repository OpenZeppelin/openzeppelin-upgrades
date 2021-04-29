// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

abstract contract Proxiable is UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) internal override {
        _beforeUpgrade(newImplementation);
    }

    function _beforeUpgrade(address newImplementation) internal virtual;
}

contract ChildOfProxiable is Proxiable {
    function _beforeUpgrade(address newImplementation) internal virtual override {}
}
