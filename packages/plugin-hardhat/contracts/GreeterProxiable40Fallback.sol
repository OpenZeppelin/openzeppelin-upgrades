pragma solidity >= 0.6.0 <0.8.0;

import { Proxiable40 } from "./utils/Proxiable40.sol";

contract GreeterProxiable40Fallback is Proxiable40 {
    string greeting;

    function initialize(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    fallback() external {}
}

contract GreeterProxiable40FallbackV2 is GreeterProxiable40Fallback {
    function resetGreeting() public {
        greeting = "Hello World";
    }
}