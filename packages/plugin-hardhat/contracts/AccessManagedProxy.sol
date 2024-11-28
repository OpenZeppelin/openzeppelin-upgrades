// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";  // Artifact for test
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";
import {IAccessManaged} from "@openzeppelin/contracts/access/manager/IAccessManaged.sol";

contract AccessManagedProxy is ERC1967Proxy {
    IAccessManager public immutable ACCESSMANAGER;

    constructor(address implementation, bytes memory _data, IAccessManager manager) payable ERC1967Proxy(implementation, _data) {
        ACCESSMANAGER = manager;
    }

    /**
     * @dev Checks with the ACCESSMANAGER if the method can be called by msg.sender and then .
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _delegate(address implementation) internal virtual override {
        (bool immediate, ) = ACCESSMANAGER.canCall(msg.sender, address(this), bytes4(msg.data[0:4]));
        if (!immediate) revert IAccessManaged.AccessManagedUnauthorized(msg.sender);
        super._delegate(implementation);
    }
}
