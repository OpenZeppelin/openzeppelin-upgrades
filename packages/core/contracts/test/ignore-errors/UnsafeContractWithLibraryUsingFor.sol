// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyLibrary.sol";

contract UnsafeContractWithLibraryUsingFor {
    using RiskyLibrary for address;

    function unsafe(address target, bytes memory data) public {
        target.internalDelegateCall(data);
    }
}
