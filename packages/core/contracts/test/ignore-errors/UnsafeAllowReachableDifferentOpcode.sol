// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveRiskyLibrary.sol";

// allow-reachable has no effect because the transitive function has a different opcode
contract UnsafeAllowReachableDifferentOpcode {
    /// @custom:oz-upgrades-unsafe-allow-reachable selfdestruct
    function unsafe(bytes memory data) public {
        TransitiveRiskyLibrary.internalDelegateCall(address(this), data);
    }
}
