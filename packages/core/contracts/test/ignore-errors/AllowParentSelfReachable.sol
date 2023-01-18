// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * allow-reachable causes the delegatecall to be ignored for all functions in this contract, including its own lexical scope
 *
 * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
 */
contract AllowParentSelfReachable {
    function internalDelegateCall(
        bytes memory data
    ) internal returns (bytes memory) {
        (, bytes memory returndata) = address(this).delegatecall(data);
        return returndata;
    }
}