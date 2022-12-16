// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveRiskyLibrary.sol";

// allow has no effect because the delegatecall is in a transitive function
contract UnsafeAllow {
    /// @custom:oz-upgrades-unsafe-allow delegatecall
    function unsafe(address target, bytes memory data) public {
        TransitiveRiskyLibrary.internalDelegateCall(target, data);
    }
}
