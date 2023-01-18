// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveUnsafeParent.sol";

/**
 * allow has no effect because the delegatecall is in a parent function
 *
 * @custom:oz-upgrades-unsafe-allow delegatecall
 */
contract UnsafeAllowParent is TransitiveUnsafeParent {
}
