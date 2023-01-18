// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * allow causes the delegatecall to be ignored for all functions in this contract
 *
 * @custom:oz-upgrades-unsafe-allow delegatecall
 */
contract AllowParent {
    function internalDelegateCall(
        bytes memory data
    ) internal returns (bytes memory) {
        (, bytes memory returndata) = address(this).delegatecall(data);
        return returndata;
    }
}