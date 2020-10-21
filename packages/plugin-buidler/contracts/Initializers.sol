pragma solidity ^0.5.1;

contract InitializerOverloaded {
  uint public x;

  function initialize(uint _x) public {
    x = _x;
  }

  function initialize(string memory) public {}
}

contract InitializerMissing {
}
