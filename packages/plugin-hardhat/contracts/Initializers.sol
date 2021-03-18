// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract InitializerOverloaded {
  uint public x;

  function initialize(uint _x) public {
    x = _x;
  }

  function initialize(string memory) public {}
}

contract InitializerMissing {
}

import "./utils/Proxiable.sol";
contract InitializerOverloadedProxiable is InitializerOverloaded, Proxiable {}
contract InitializerMissingProxiable is InitializerMissing, Proxiable {}
