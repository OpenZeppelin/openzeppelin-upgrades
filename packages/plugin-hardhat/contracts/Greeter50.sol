pragma solidity >= 0.4.22 <0.8.0;

contract Greeter50 {

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

import "./utils/Proxiable50.sol";
contract Greeter50Proxiable is Greeter50, Proxiable50 {}
