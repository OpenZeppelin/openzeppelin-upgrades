// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./AllowReachableParentCall.sol";

contract AllowChildCallTransitive is AllowReachableParentCall {
  function myfunction(bytes memory data) internal {
      allowed(data);
  }
}
