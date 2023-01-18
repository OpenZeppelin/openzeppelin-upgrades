// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyParentContract.sol";

/**
 * allow-reachable causes the delegatecall to be ignored for all reachable functions from this contract
 *
 * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
 */
contract AllowReachableParentCall is RiskyParentContract {
    function allowed(bytes memory data) internal {
        internalDelegateCall(address(this), data);
    }
}