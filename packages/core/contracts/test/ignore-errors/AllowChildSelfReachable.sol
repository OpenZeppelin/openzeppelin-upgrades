// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./AllowParentSelfReachable.sol";

contract AllowChildSelfReachable is AllowParentSelfReachable {
  function shouldBeAllowed(bytes memory data) public {
    internalDelegateCall(data);
  }
}
