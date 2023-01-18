// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveRiskyLibrary.sol";

contract UnsafeContractWithTransitiveLibraryCall {
    function unsafe(address target, bytes memory data) public {
        TransitiveRiskyLibrary.internalDelegateCall(target, data);
    }
}
