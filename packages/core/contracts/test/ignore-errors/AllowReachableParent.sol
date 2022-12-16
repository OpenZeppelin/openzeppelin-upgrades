// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveUnsafeParent.sol";

/**
 * allow-reachable causes the delegatecall in a parent function to be ignored
 *
 * this is actually unsafe but only allowed here for testing purposes!
 *
 * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
 */
contract AllowReachableParent is TransitiveUnsafeParent {
}
