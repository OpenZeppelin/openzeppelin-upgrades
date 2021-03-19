pragma solidity >= 0.4.22 <0.8.0;

contract Greeter {
    function version() external pure returns (uint256) {
      return 1;
    }
}

contract GreeterV2 {
    function version() external pure returns (uint256) {
      return 2;
    }
}

import "./utils/Proxiable.sol";
contract GreeterProxiable is Greeter, Proxiable {}
contract GreeterV2Proxiable is GreeterV2, Proxiable {}
