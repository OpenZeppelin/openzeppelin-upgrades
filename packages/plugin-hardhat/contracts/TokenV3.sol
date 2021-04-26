pragma solidity ^0.5.1;

import "./Token.sol";

contract TokenV3 is Token {
 function transferPercent(address to, uint256 pct) external {
    uint256 amount = SafePercent.getPercent(balances[msg.sender], pct);
    transfer(to, amount);
  }
}

import "./utils/Proxiable.sol";
contract TokenV3Proxiable is TokenV3, Proxiable {}
