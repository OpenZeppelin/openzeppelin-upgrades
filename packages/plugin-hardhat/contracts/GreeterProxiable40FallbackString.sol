pragma solidity >= 0.6.0 <0.8.0;

import { Proxiable40 } from "./utils/Proxiable40.sol";

contract GreeterProxiable40FallbackString is Proxiable40 {
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