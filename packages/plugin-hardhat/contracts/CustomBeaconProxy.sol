// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

// Example of a custom beacon proxy.
// This contract is for testing only, it is not safe for use in production.

contract CustomBeaconProxy is BeaconProxy {
    address private immutable _deployer;
    // The beacon that will be used on calls by the deployer address
    address private immutable _deployerBeacon;

    constructor(address beacon, bytes memory data, address deployerBeacon) payable BeaconProxy(beacon, data) {
        _deployer = msg.sender;
        _deployerBeacon = deployerBeacon;
    }

    function _getBeacon() internal view override returns (address) {
        if (msg.sender == _deployer) return _deployerBeacon;
        return super._getBeacon();
    }
}
