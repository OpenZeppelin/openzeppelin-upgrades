pragma solidity >= 0.4.22 <0.8.0;

contract Greeter {

    string greeting;

    function initialize(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

}

import "./utils/Proxiable.sol";
contract GreeterProxiable is Greeter, Proxiable {}
contract GreeterBeaconImpl is Greeter {}
contract GreeterStandaloneImpl is Greeter {}
contract GreeterDeployImpl is Greeter {
    function extra() public {}
}