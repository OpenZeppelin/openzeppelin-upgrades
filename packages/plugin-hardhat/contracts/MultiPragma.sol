pragma solidity ^0.5.1;

import "./Greeter.sol";

contract GreeterMultiPragma is Greeter {
    function setAndGreet(string memory _greeting) public returns (string memory) {
      setGreeting(_greeting);
      return greet();
    }
}

import "./utils/Proxiable.sol";
contract GreeterMultiPragmaProxiable is GreeterMultiPragma, Proxiable {}
