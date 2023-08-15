pragma solidity >= 0.4.22 <0.8.0;

contract GreeterDefender {
    function version() external pure returns (uint256) {
      return 1;
    }
}

contract GreeterDefenderV2 {
    function version() external pure returns (uint256) {
      return 2;
    }
}

contract GreeterDefenderV2Bad {
  function x() public {
    (bool ok, ) = address(this).delegatecall("");
    require(ok);
  }
}

contract GreeterDefenderV3 {
  uint256 immutable versionNumber;
  constructor(uint256 initialVersion) public {
    versionNumber = initialVersion;
  }
  function version() external view returns (uint256) {
    return versionNumber;
  }
}

import "./utils/Proxiable.sol";
contract GreeterDefenderProxiable is GreeterDefender, Proxiable {}
contract GreeterDefenderV2Proxiable is GreeterDefenderV2, Proxiable {}
