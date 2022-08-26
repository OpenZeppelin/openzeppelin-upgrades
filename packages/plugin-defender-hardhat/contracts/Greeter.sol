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

contract GreeterV3 {
  uint256 immutable versionNumber;
  constructor(uint256 initialVersion) public {
    versionNumber = initialVersion;
  }
  function version() external view returns (uint256) {
    return versionNumber;
  }
}

import "./utils/Proxiable.sol";
contract GreeterProxiable is Greeter, Proxiable {}
contract GreeterV2Proxiable is GreeterV2, Proxiable {}
