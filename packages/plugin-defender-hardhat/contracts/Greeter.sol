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

contract GreeterV2Bad {
  function x() public {
    (bool ok, ) = address(this).delegatecall("");
    require(ok);
  }
}

import "./utils/Proxiable.sol";
contract GreeterProxiable is Greeter, Proxiable {}
contract GreeterV2Proxiable is GreeterV2, Proxiable {}
