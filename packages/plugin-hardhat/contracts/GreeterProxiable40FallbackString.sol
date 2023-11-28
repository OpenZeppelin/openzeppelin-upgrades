pragma solidity >= 0.6.0 <0.8.0;

import { Proxiable } from "./utils/Proxiable.sol";

contract GreeterProxiable40FallbackString is Proxiable {
    string greeting;

    function initialize(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    fallback(bytes calldata) external returns (bytes memory) {
        return abi.encode(greeting);
    }
}

contract GreeterProxiable40FallbackStringV2 is GreeterProxiable40FallbackString {
    function resetGreeting() public {
        greeting = "Hello World";
    }
}