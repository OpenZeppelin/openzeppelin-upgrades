// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveUnsafeParent.sol";

/**
 * allow-reachable has no effect because the parent function has a different opcode
 *
 * @custom:oz-upgrades-unsafe-allow-reachable selfdestruct
 */
contract UnsafeAllowReachableParentDifferentOpcode is TransitiveUnsafeParent {
}
