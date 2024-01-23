pragma solidity ^0.5.1;

import "./ExternalLibraries.sol";

contract MultipleExternalLibraries {

  function getLibraryVersion() external pure returns(string memory) {
      return SafeMath.version();
  }

  function getLibrary2Version() external pure returns(string memory) {
      return SafeMathV2.version();
  }
}