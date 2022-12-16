// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveRiskyLibrary.sol";

// allow-reachable causes the delegatecall in a transitive function to be ignored
contract AllowReachable {
    /// @custom:oz-upgrades-unsafe-allow-reachable delegatecall
    function unsafe(bytes memory data) public {
        TransitiveRiskyLibrary.internalDelegateCall(address(this), data);
    }
}
