pragma solidity >= 0.4.22 <0.8.0;

contract GreeterPlatform {
    function version() external pure returns (uint256) {
      return 1;
    }
}

contract GreeterPlatformV2 {
    function version() external pure returns (uint256) {
      return 2;
    }
}

contract GreeterPlatformV2Bad {
  function x() public {
    (bool ok, ) = address(this).delegatecall("");
    require(ok);
  }
}

import "./utils/Proxiable.sol";
contract GreeterPlatformProxiable is GreeterPlatform, Proxiable {}
contract GreeterPlatformV2Proxiable is GreeterPlatformV2, Proxiable {}
