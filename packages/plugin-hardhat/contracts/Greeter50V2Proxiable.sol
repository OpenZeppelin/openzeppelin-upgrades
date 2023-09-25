pragma solidity ^0.5.1;

import "./GreeterV2.sol";
import "./utils/Proxiable50.sol";

contract Greeter50V2Proxiable is GreeterV2, Proxiable50 {}
