pragma solidity >= 0.4.22 <0.8.0;

import "./Greeter.sol";
import "./utils/Proxiable50.sol";

contract Greeter50Proxiable is Greeter, Proxiable50 {}
