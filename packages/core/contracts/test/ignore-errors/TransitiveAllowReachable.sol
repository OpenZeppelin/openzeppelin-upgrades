// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyLibrary.sol";

/**
 * allow delegatecalls on all of this contract's functions and reachable code
 *
 * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
 */
contract TransitiveAllowReachable {
      function internalDelegateCall(
        bytes memory data
    ) external returns (bytes memory) {
        return RiskyLibrary.internalDelegateCall(address(this), data);
    }
}