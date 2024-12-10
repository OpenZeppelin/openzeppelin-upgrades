// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Example of a custom proxy.
// This contract is for testing only.

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";
import {IAccessManaged} from "@openzeppelin/contracts/access/manager/IAccessManaged.sol";

contract AccessManagedProxy is ERC1967Proxy {
    IAccessManager public immutable ACCESS_MANAGER;

    constructor(address implementation, bytes memory _data, IAccessManager manager) payable ERC1967Proxy(implementation, _data) {
        ACCESS_MANAGER = manager;
    }

    /**
     * @dev Checks with the ACCESS_MANAGER if msg.sender is authorized to call the current call's function,
     * and if so, delegates the current call to `implementation`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _delegate(address implementation) internal virtual override {
        (bool immediate, ) = ACCESS_MANAGER.canCall(msg.sender, address(this), bytes4(msg.data[0:4]));
        if (!immediate) revert IAccessManaged.AccessManagedUnauthorized(msg.sender);
        super._delegate(implementation);
    }
}
