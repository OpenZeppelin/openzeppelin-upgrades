// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./AllowParent.sol";

contract AllowChild is AllowParent {
  function shouldBeAllowed(bytes memory data) public {
    internalDelegateCall(data);
  }
}
